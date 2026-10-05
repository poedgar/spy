import { act, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import AppLayout from '../../app/(app)/_layout';
import { fakeUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

function OnlineCount() {
  return <Text testID="online">{String(useOnlineUserIds().size)}</Text>;
}

const routes = { '(app)/_layout': AppLayout, '(app)/index': OnlineCount, '(app)/spy/index': () => <Text>spy</Text> };

test('tracks presence and shows a banner for a live invitation', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [], pending_invitations: [] });
  await renderApp(routes, { initialUrl: '/', user: fakeUser });
  await waitFor(() => expect(echo.join).toHaveBeenCalledWith('online-users'));

  act(() => echo.presence.here([{ id: 1 }, { id: 2 }]));
  expect(screen.getByTestId('online')).toHaveTextContent('2');
  act(() => echo.presence.leaving({ id: 2 }));
  expect(screen.getByTestId('online')).toHaveTextContent('1');

  act(() =>
    echo.emit(`private-user.${fakeUser.id}`, '.invitation.sent', {
      invitation_id: 9,
      game_title: 'Op Sunrise',
      game_code: 'SPY-ZZ22',
      from_codename: 'NIGHT_HAWK',
    }),
  );
  expect(await screen.findByText('NIGHT_HAWK invited you to Op Sunrise')).toBeOnTheScreen();
});
