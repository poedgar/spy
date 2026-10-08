import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { notificationsApi } from '@/api/endpoints';
import type { AppNotification } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import GamePicker from '../../app/(app)/index';
import NotificationsScreen from '../../app/(app)/notifications';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/index': GamePicker,
  '(app)/notifications': NotificationsScreen,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
  '(app)/phrase/index': () => <Text>phrase home</Text>,
};

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n-1',
    kind: 'round_started',
    title: 'Round 2 has begun',
    body: 'Open Op Echo to see your role.',
    link: '/games/SPY-AB3D',
    game_code: 'SPY-AB3D',
    game_type: 'spy',
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test('the bell shows the unread count and opens the list', async () => {
  jest.mocked(notificationsApi.list).mockResolvedValue({ unread_count: 3, notifications: [notification()] });
  await renderApp(routes, { initialUrl: '/', user: fakeUser });

  expect(await screen.findByTestId('notification-count')).toHaveTextContent('3');
  fireEvent.press(screen.getByTestId('btn-notifications'));

  await waitFor(() => expect(screen).toHavePathname('/notifications'));
  expect(await screen.findByText('Round 2 has begun')).toBeOnTheScreen();
});

test('opening a notification marks it read and goes where it points', async () => {
  jest.mocked(notificationsApi.list).mockResolvedValue({
    unread_count: 1,
    notifications: [notification({ id: 'n-7', kind: 'invitation', link: '/games/phrase', title: 'New operation invite' })],
  });
  jest.mocked(notificationsApi.read).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/notifications', user: fakeUser });

  const item = await screen.findByTestId('notification-n-7');
  expect(screen.getByTestId('unread-n-7')).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(item);
  });

  expect(notificationsApi.read).toHaveBeenCalledWith('n-7');
  await waitFor(() => expect(screen).toHavePathname('/phrase'));
});

test('mark all as read clears the list', async () => {
  jest
    .mocked(notificationsApi.list)
    .mockResolvedValueOnce({ unread_count: 2, notifications: [notification(), notification({ id: 'n-2' })] })
    .mockResolvedValue({
      unread_count: 0,
      notifications: [notification({ read_at: 'now' }), notification({ id: 'n-2', read_at: 'now' })],
    });
  jest.mocked(notificationsApi.readAll).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/notifications', user: fakeUser });

  const readAll = await screen.findByTestId('btn-read-all');
  await act(async () => {
    fireEvent.press(readAll);
  });

  expect(notificationsApi.readAll).toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByTestId('btn-read-all')).toBeNull());
  expect(screen.queryByTestId('unread-n-1')).toBeNull();
});

test('an empty feed says so', async () => {
  jest.mocked(notificationsApi.list).mockResolvedValue({ unread_count: 0, notifications: [] });
  await renderApp(routes, { initialUrl: '/notifications', user: fakeUser });

  expect(await screen.findByText('Nothing yet. Invitations and game news will show up here.')).toBeOnTheScreen();
});
