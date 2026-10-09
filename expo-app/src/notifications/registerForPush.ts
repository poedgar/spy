import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { meApi } from '@/api/endpoints';
import { EAS_PROJECT_ID } from '@/config';
import { ANDROID_CHANNELS } from './channels';

/**
 * Asks for permission (the OS only prompts once) and registers this device's
 * Expo push token with the API. Returns null when push isn't available:
 * simulator, no EAS project id, or permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice || !EAS_PROJECT_ID) return null;

  if (Platform.OS === 'android') {
    for (const channel of ANDROID_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  await meApi.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  return token;
}
