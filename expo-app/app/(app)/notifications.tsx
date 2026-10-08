import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMarkNotificationsRead, useNotifications, useRefreshOnFocus } from '@/api/queries';
import type { AppNotification } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { relativeTime } from '@/game/relativeTime';
import { useI18n } from '@/i18n/I18nProvider';
import { notificationHref } from '@/linking';
import { useTheme } from '@/theme/useTheme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors, spacing } = useTheme();
  const feed = useNotifications();
  const markRead = useMarkNotificationsRead();
  useRefreshOnFocus(feed.refetch);

  const open = (notification: AppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id);
    router.push(notificationHref(notification.link));
  };

  // Captured once per visit; pull to refresh to update the times.
  const [now] = useState(() => Date.now());


  return (
    <Screen refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()}>
      <Stack.Screen options={{ title: t('Notifications') }} />
      {feed.data?.unread_count ? (
        <Button
          testID="btn-read-all"
          label={t('Mark all as read')}
          variant="secondary"
          loading={markRead.isPending && markRead.variables === undefined}
          onPress={() => markRead.mutate(undefined)}
        />
      ) : null}
      {feed.data?.notifications.length ? (
        feed.data.notifications.map((notification) => (
          <Pressable
            key={notification.id}
            testID={`notification-${notification.id}`}
            accessibilityRole="button"
            onPress={() => open(notification)}
          >
            <Card style={notification.read_at ? undefined : { borderColor: colors.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {notification.read_at ? null : (
                  <View
                    testID={`unread-${notification.id}`}
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }}
                  />
                )}
                <AppText variant="heading" style={{ flex: 1 }}>
                  {notification.title}
                </AppText>
              </View>
              <AppText>{notification.body}</AppText>
              <AppText variant="muted">{relativeTime(notification.created_at, locale, now)}</AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState
          message={feed.isLoading ? t('Loading…') : t('Nothing yet. Invitations and game news will show up here.')}
        />
      )}
    </Screen>
  );
}
