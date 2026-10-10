import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import type { Game } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import InvitePlayers from '../../app/(app)/games/[code]/invite';
import JoinGame from '../../app/(app)/spy/join';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { type FakeEcho, NOTIFICATION_EVENT } from '../support/fakeEcho';
import { answerDialog } from '../support/dialog';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/games/[code]/index': Lobby,
  '(app)/games/[code]/invite': InvitePlayers,
  '(app)/spy/join': JoinGame,
  '(app)/spy/index': () => <Text>spy home</Text>,
};

const guest = { id: 5, name: 'Gus', codename: 'LUNAR_HERON' };
const players = [
  { id: 100, user: fakeUser, is_host: true, status: 'ready' as const, score: 0, joined_at: null },
  { id: 101, user: otherUser, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
];

function hostView(overrides: Partial<Game> = {}): Game {
  return fakeGame({ players, player_count: 2, requires_approval: true, join_requests: [], invitations: [], ...overrides });
}

test('a code join into an approval game becomes a request', async () => {
  jest.mocked(gamesApi.join).mockResolvedValue({ status: 'requested', code: 'SPY-AB3D', title: 'Gatekeeper', game_type: 'spy' });
  await renderApp(routes, { initialUrl: '/spy/join', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-join-code'), 'SPY-AB3D');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-join-game'));
  });

  expect(await screen.findByText('Request sent. The host will let you in.')).toBeOnTheScreen();
  await waitFor(() => expect(screen).toHavePathname('/spy'));
});

test('the host lets a waiting player in and turns approval off', async () => {
  jest
    .mocked(gamesApi.show)
    .mockResolvedValue(hostView({ join_requests: [{ id: 9, user: guest, created_at: null }] }));
  jest.mocked(gamesApi.answerJoinRequest).mockResolvedValue(hostView());
  jest.mocked(gamesApi.updateSettings).mockResolvedValue(hostView({ requires_approval: false }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const approve = await screen.findByTestId('btn-approve-9');
  await act(async () => {
    fireEvent.press(approve);
  });
  expect(gamesApi.answerJoinRequest).toHaveBeenCalledWith('SPY-AB3D', 9, true);
  await waitFor(() => expect(screen.queryByTestId('join-request-9')).toBeNull());

  await act(async () => {
    fireEvent(screen.getByTestId('toggle-approval'), 'valueChange', false);
  });
  expect(gamesApi.updateSettings).toHaveBeenCalledWith('SPY-AB3D', { requires_approval: false });
});

test('the host re-sends or cancels an invitation that was not taken up', async () => {
  const outstanding = { id: 7, status: 'declined' as const, user: guest, updated_at: null };
  jest.mocked(gamesApi.show).mockResolvedValue(hostView({ invitations: [outstanding] }));
  jest.mocked(gamesApi.invite).mockResolvedValue({} as never);
  jest.mocked(gamesApi.cancelInvitation).mockResolvedValue(hostView());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('outstanding-7')).toHaveTextContent(/declined/);
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-reinvite-7'));
  });
  expect(gamesApi.invite).toHaveBeenCalledWith('SPY-AB3D', guest.id);

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-cancel-invitation-7'));
  });
  expect(gamesApi.cancelInvitation).toHaveBeenCalledWith('SPY-AB3D', 7);
});

test('the host hands hosting over from the roster', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(hostView());
  jest.mocked(gamesApi.transferHost).mockResolvedValue(hostView({ host_id: otherUser.id, host: otherUser }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const row = await screen.findByTestId('roster-2');
  await act(async () => {
    fireEvent.press(row);
  });
  await answerDialog('Make host');

  expect(gamesApi.transferHost).toHaveBeenCalledWith('SPY-AB3D', otherUser.id);
  await waitFor(() => expect(screen.queryByTestId('host-panel')).toBeNull());
});

test('the host can leave too; hosting moves on', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(hostView());
  jest.mocked(gamesApi.leave).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const leave = await screen.findByTestId('btn-leave-game');
  await act(async () => {
    fireEvent.press(leave);
  });

  expect(
    within(screen.getByTestId('dialog')).getByText(
      'Leave? Hosting passes to the next player, or the game closes if nobody is left.',
    ),
  ).toBeOnTheScreen();
  expect(gamesApi.leave).not.toHaveBeenCalled();
  await answerDialog('Confirm');
  expect(gamesApi.leave).toHaveBeenCalledWith('SPY-AB3D');
});

test('the invite list searches beyond who is online and past teammates', async () => {
  jest.mocked(gamesApi.invitableUsers).mockImplementation(async (_code, search) =>
    search ? [{ ...guest, online: false, invite_status: null }] : [],
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D/invite', user: fakeUser });

  expect(await screen.findByText('Players online now and people you have played with appear here. Search to find anyone else.')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('input-invite-search'), 'heron');

  expect(await screen.findByTestId(`invitable-${guest.id}`)).toBeOnTheScreen();
  expect(gamesApi.invitableUsers).toHaveBeenLastCalledWith('SPY-AB3D', 'heron');
});

test('an approved request is announced live', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(hostView());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('lobby-code');
  await waitFor(() => expect(echo.private).toHaveBeenCalledWith('user.1'));
  act(() =>
    echo.emit('private-user.1', NOTIFICATION_EVENT, {
      id: 'n-2',
      kind: 'join_answered',
      title: 'You are in!',
      body: 'The host let you into Gatekeeper.',
      link: '/games/SPY-CD4E',
      game_code: 'SPY-CD4E',
      game_type: 'spy',
      read_at: null,
      created_at: null,
    }),
  );

  expect(await screen.findByText('You are in!: The host let you into Gatekeeper.')).toBeOnTheScreen();
});

test('cancelling a confirmation does nothing and closes it', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(hostView());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const leave = await screen.findByTestId('btn-leave-game');
  await act(async () => {
    fireEvent.press(leave);
  });
  await answerDialog('Cancel');

  expect(gamesApi.leave).not.toHaveBeenCalled();
  expect(screen.queryByTestId('dialog')).toBeNull();
});
