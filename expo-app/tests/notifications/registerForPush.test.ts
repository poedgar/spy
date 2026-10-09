import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { meApi } from '@/api/endpoints';
import { registerForPushNotifications } from '@/notifications/registerForPush';

let mockIsDevice = true;

jest.mock('@/api/endpoints');
jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() {
    return mockIsDevice;
  },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

beforeEach(() => {
  mockIsDevice = true;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[x]' });
});

test('registers the Expo token with the API when permission is granted', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);

  await expect(registerForPushNotifications()).resolves.toBe('ExponentPushToken[x]');

  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project' });
  expect(meApi.registerPushToken).toHaveBeenCalledWith('ExponentPushToken[x]', Platform.OS === 'ios' ? 'ios' : 'android');
});

test('asks for permission when undetermined and stops if denied', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'undetermined' } as never);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);

  await expect(registerForPushNotifications()).resolves.toBeNull();

  expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  expect(meApi.registerPushToken).not.toHaveBeenCalled();
});

test('does nothing on a simulator', async () => {
  mockIsDevice = false;

  await expect(registerForPushNotifications()).resolves.toBeNull();

  expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
});

test('creates every Android channel the server sends pushes to', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
  try {
    await registerForPushNotifications();
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  }

  const created = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls.map(([id]) => id);
  expect(created).toEqual(['invitations', 'game']);
});
