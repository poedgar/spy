import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HEARTBEAT_MS, NOTIFICATIONS_POLL_MS, useNotifications } from '@/api/queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useRealtimeConnected } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

/** Header button to the notifications screen, with the unread count. */
export function NotificationBell() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors, fontSize } = useTheme();
  const connected = useRealtimeConnected();
  const feed = useNotifications({ pollMs: connected ? HEARTBEAT_MS : NOTIFICATIONS_POLL_MS });
  const unread = feed.data?.unread_count ?? 0;

  return (
    <Pressable
      testID="btn-notifications"
      accessibilityRole="button"
      accessibilityLabel={unread ? `${t('Notifications')} (${unread})` : t('Notifications')}
      onPress={() => router.push('/notifications')}
      hitSlop={8}
    >
      <View>
        <AppText style={{ fontSize: fontSize.lg }}>🔔</AppText>
        {unread > 0 ? (
          <View
            testID="notification-count"
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              minWidth: 16,
              paddingHorizontal: 3,
              borderRadius: 8,
              backgroundColor: colors.destructive,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.destructiveForeground, fontSize: 10, fontWeight: '700' }}>
              {unread > 9 ? '9+' : String(unread)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
