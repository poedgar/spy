import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { queryKeys } from '@/api/queries';
import type { InvitationSentPayload, PlayerJoinedPayload } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { homePathFor } from '@/linking';
import { PUSHER_KEY } from '@/config';
import { createEcho, type EchoClient } from './echo';

interface PresenceMember {
  id: number;
  codename: string;
}

const RealtimeContext = createContext<{ echo: EchoClient | null; onlineUserIds: Set<number> }>({
  echo: null,
  onlineUserIds: new Set(),
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const token = state.status === 'signedIn' ? state.token : null;
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const queryClient = useQueryClient();
  const { showBanner } = useBanner();
  // Read through a ref so a language change doesn't reconnect the socket.
  const { t } = useI18n();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  const [echo, setEcho] = useState<EchoClient | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !userId || !PUSHER_KEY) return;

    const instance = createEcho(token);
    // The Echo client is an external system created per session; exposing it
    // through state costs one extra render on sign-in, which is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEcho(instance);

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

    instance.private(`user.${userId}`).listen('.invitation.sent', (payload: InvitationSentPayload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
      showBanner({
        message: tRef.current(':codename invited you to :title', {
          codename: payload.from_codename,
          title: payload.game_title,
        }),
        onPress: () =>
          router.push({ pathname: homePathFor(payload.game_type), params: { highlight: String(payload.invitation_id) } }),
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
      instance.disconnect();
      setEcho(null);
      setOnlineUserIds(new Set());
    };
    // showBanner and queryClient are stable; reconnect only when the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  return <RealtimeContext.Provider value={{ echo, onlineUserIds }}>{children}</RealtimeContext.Provider>;
}

export function useOnlineUserIds(): Set<number> {
  return useContext(RealtimeContext).onlineUserIds;
}

/**
 * Subscribes to a game's channel while the calling screen is focused. Both
 * events carry no secrets, so the handler refetches the player's own view.
 */
export function useGameChannel(gameId: number | undefined, onChange: (payload?: PlayerJoinedPayload) => void) {
  const { echo } = useContext(RealtimeContext);
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

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
