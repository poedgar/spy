import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { queryKeys } from '@/api/queries';
import { notificationsApi } from '@/api/endpoints';
import type { AppNotification, PlayerJoinedPayload } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { notificationHref } from '@/linking';
import { PUSHER_KEY } from '@/config';
import { createEcho, type EchoClient } from './echo';

interface PresenceMember {
  id: number;
  codename: string;
}

const RealtimeContext = createContext<{ echo: EchoClient | null; onlineUserIds: Set<number>; connected: boolean }>({
  echo: null,
  onlineUserIds: new Set(),
  connected: false,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const token = state.status === 'signedIn' ? state.token : null;
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const queryClient = useQueryClient();
  const { showBanner } = useBanner();
  const [echo, setEcho] = useState<EchoClient | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !userId || !PUSHER_KEY) return;

    const instance = createEcho(token);
    // The Echo client is an external system created per session; exposing it
    // through state costs one extra render on sign-in, which is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEcho(instance);

    // Screens fall back to polling while the socket is down.
    const connection = instance.connector.pusher.connection;
    const onStateChange = ({ current }: { current: string }) => setConnected(current === 'connected');
    connection.bind('state_change', onStateChange);
    setConnected(connection.state === 'connected');

    instance
      .join('online-users')
      .here((members: PresenceMember[]) => setOnlineUserIds(new Set(members.map((m) => m.id))))
      .joining((member: PresenceMember) => setOnlineUserIds((prev) => new Set(prev).add(member.id)))
      .leaving((member: PresenceMember) =>
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        }),
      );

    // Notifications arrive on the user's private channel: refresh what they
    // may have changed and show a banner that opens where they point.
    instance.private(`user.${userId}`).notification((notification: AppNotification) => {
      for (const key of [queryKeys.notifications, queryKeys.spyHome, queryKeys.phraseHome]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      if (notification.game_code) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.game(notification.game_code) });
      }
      showBanner({
        tone: notification.kind === 'removed' ? 'error' : 'info',
        message: `${notification.title}: ${notification.body}`,
        onPress: () => {
          void notificationsApi.read(notification.id).catch(() => {});
          router.push(notificationHref(notification.link));
        },
      });
    });

    // iOS drops sockets in the background anyway; push notifications cover
    // that gap. pusher-js resubscribes every channel on reconnect.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') instance.connector.pusher.connect();
      else if (status === 'background') instance.connector.pusher.disconnect();
    });

    return () => {
      subscription.remove();
      connection.unbind('state_change', onStateChange);
      instance.disconnect();
      setEcho(null);
      setOnlineUserIds(new Set());
      setConnected(false);
    };
    // showBanner and queryClient are stable; reconnect only when the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  return <RealtimeContext.Provider value={{ echo, onlineUserIds, connected }}>{children}</RealtimeContext.Provider>;
}

/** False when realtime is unconfigured or the socket is down: poll instead. */
export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext).connected;
}

export function useOnlineUserIds(): Set<number> {
  return useContext(RealtimeContext).onlineUserIds;
}

/**
 * Subscribes to a game's channel while the calling screen is focused. Both
 * events carry no secrets, so the handler refetches the player's own view.
 */
export function useGameChannel(gameId: number | undefined, onChange: (payload?: PlayerJoinedPayload) => void) {
  const { echo, connected } = useContext(RealtimeContext);
  const wasConnected = useRef(connected);
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  // Coming back online may have missed events: catch up once.
  useEffect(() => {
    if (connected && !wasConnected.current && gameId !== undefined) handler.current();
    wasConnected.current = connected;
  }, [connected, gameId]);

  useFocusEffect(
    useCallback(() => {
      if (!echo || gameId === undefined) return;
      const name = `game.${gameId}`;
      echo
        .private(name)
        .listen('.player.joined', (payload: PlayerJoinedPayload) => handler.current(payload))
        .listen('.game.updated', () => handler.current());
      return () => echo.leave(name);
    }, [echo, gameId]),
  );
}
