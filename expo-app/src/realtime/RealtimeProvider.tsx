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

const RealtimeContext = createContext<{
  echo: EchoClient | null;
  onlineUserIds: Set<number>;
  connected: boolean;
  error: string | null;
}>({
  echo: null,
  onlineUserIds: new Set(),
  connected: false,
  error: null,
});

/** An error's name, message and first stack frames, for Settings to show. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const frames = (error.stack ?? '').split('\n').slice(1, 9).map((line) => line.trim());
  return [`${error.name}: ${error.message}`, ...frames].join('\n');
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const token = state.status === 'signedIn' ? state.token : null;
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const queryClient = useQueryClient();
  const { showBanner } = useBanner();
  const [echo, setEcho] = useState<EchoClient | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId || !PUSHER_KEY) return;

    // Realtime is best-effort: if it can't start, screens poll instead of
    // the app failing. The error stays visible in Settings for diagnosis.
    let instance: EchoClient;
    try {
      instance = createEcho(token);
    } catch (caught) {
      console.error('Realtime unavailable', caught);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(describeError(caught));
      return;
    }
    // The Echo client is an external system created per session; exposing it
    // through state costs one extra render on sign-in, which is intended.
    setEcho(instance);

    // Screens fall back to polling while the socket is down.
    const connection = instance.connector.pusher.connection;
    const onStateChange = ({ current }: { current: string }) => setConnected(current === 'connected');
    connection.bind('state_change', onStateChange);
    setConnected(connection.state === 'connected');

    try {
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
    } catch (caught) {
      console.error('Realtime channels unavailable', caught);
      setError(describeError(caught));
    }

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

  return (
    <RealtimeContext.Provider value={{ echo, onlineUserIds, connected, error }}>{children}</RealtimeContext.Provider>
  );
}

/** False when realtime is unconfigured or the socket is down: poll instead. */
export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext).connected;
}

/** Why realtime couldn't start, if it couldn't. */
export function useRealtimeError(): string | null {
  return useContext(RealtimeContext).error;
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
      try {
        echo
          .private(name)
          .listen('.player.joined', (payload: PlayerJoinedPayload) => handler.current(payload))
          .listen('.game.updated', () => handler.current());
      } catch (caught) {
        // The lobby polls while realtime is down; never fail the screen.
        console.error('Game channel unavailable', caught);
        return;
      }
      return () => echo.leave(name);
    }, [echo, gameId]),
  );
}
