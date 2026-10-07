import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { invitationHrefFrom, roundHrefFrom } from '@/linking';
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

  useEffect(() => {
    if (userId === null) return;
    registerForPushNotifications().catch(() => {
      // Push is best-effort; the app works without it.
    });
  }, [userId]);

  // Covers both a tap while running and a tap that cold-started the app.
  useEffect(() => {
    if (!lastResponse || userId === null) return;
    const data = lastResponse.notification.request.content.data;
    const href = invitationHrefFrom(data) ?? roundHrefFrom(data);
    if (href) router.push(href);
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse, userId]);

  return <>{children}</>;
}
