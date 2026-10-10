import { screen, waitFor } from 'expo-router/testing-library';
import { Slot, useLocalSearchParams } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Text } from 'react-native';
import { NotificationsProvider } from '@/notifications/NotificationsProvider';
import AppLayout from '../../app/(app)/_layout';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
jest.mock('@/notifications/registerForPush', () => ({ registerForPushNotifications: jest.fn(async () => null) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  useLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
}));

function RootLayout() {
  return (
    <NotificationsProvider>
      <Slot />
    </NotificationsProvider>
  );
}

function SpyHomeStub() {
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  return <Text>{`spy home, highlight ${highlight ?? 'none'}`}</Text>;
}

const routes = {
  _layout: RootLayout,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>games</Text>,
  '(app)/spy/index': SpyHomeStub,
};

const tap = (data: Record<string, unknown>) =>
  ({ notification: { request: { content: { data } } } }) as unknown as Notifications.NotificationResponse;

test('tapping an invitation push, even one that started the app, opens the invitation', async () => {
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue(
    tap({ type: 'invitation', invitation_id: 7, code: 'SPY-AB3D', game_type: 'spy' }),
  );

  await renderApp(routes, { initialUrl: '/', user: fakeUser });

  expect(await screen.findByText('spy home, highlight 7')).toBeOnTheScreen();
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
});

test('a push with data the app does not know is ignored', async () => {
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue(tap({ type: 'something-new' }));

  await renderApp(routes, { initialUrl: '/', user: fakeUser });

  expect(await screen.findByText('games')).toBeOnTheScreen();
  await waitFor(() => expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled());
  expect(screen).toHavePathname('/');
});
