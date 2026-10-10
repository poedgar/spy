import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { pushHrefFrom } from '@/linking';
import { registerForPushNotifications } from './registerForPush';

// While the app is open, the realtime banner already announces invitations,
// so the OS banner is suppressed (the notification still lands in the list).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const lastResponse = Notifications.useLastNotificationResponse();
  // A tap can cold-start the app; navigating before the router is ready
  // throws, which would crash a release build.
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (userId === null) return;
    registerForPushNotifications().catch(() => {
      // Push is best-effort; the app works without it.
    });
  }, [userId]);

  // Covers both a tap while running and a tap that cold-started the app.
  useEffect(() => {
    if (!lastResponse || userId === null || !navigationReady) return;
    Notifications.clearLastNotificationResponse();
    const href = pushHrefFrom(lastResponse.notification.request.content.data);
    if (!href) return;
    try {
      router.push(href);
    } catch {
      // Never crash over a notification; the app simply opens where it was.
    }
  }, [lastResponse, userId, navigationReady]);

  return <>{children}</>;
}
