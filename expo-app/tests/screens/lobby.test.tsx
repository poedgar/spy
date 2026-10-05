import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Share } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/index': Lobby };

test('shows the roster and refetches when a player joins live', async () => {
  const joined = fakeGame({
    player_count: 2,
    players: [...fakeGame().players!, { id: 101, user: otherUser, is_host: false, status: 'ready', joined_at: null }],
  });
  jest.mocked(gamesApi.show).mockResolvedValueOnce(fakeGame()).mockResolvedValue(joined);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('roster-1')).toBeOnTheScreen();
  expect(screen.getByTestId('lobby-code')).toHaveTextContent('SPY-AB3D');
  await waitFor(() => expect(echo.private).toHaveBeenCalledWith('game.10'));

  act(() => echo.emit('private-game.10', '.player.joined', { player: joined.players![1], player_count: 2 }));

  expect(await screen.findByTestId('roster-2')).toBeOnTheScreen();
});

test('the host sees Invite Players while recruiting; others do not', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame({ host_id: otherUser.id, host: otherUser }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('lobby-code');
  expect(screen.queryByTestId('btn-invite-players')).toBeNull();
});

test('share sends the code and the deep link', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const button = await screen.findByTestId('btn-share');
  await act(async () => {
    fireEvent.press(button);
  });

  expect(share.mock.calls[0][0].message).toContain('SPY-AB3D');
  expect(share.mock.calls[0][0].message).toContain('spynet://join/SPY-AB3D');
});

test('a non-member sees an explicit join prompt and can join', async () => {
  jest.mocked(gamesApi.show).mockRejectedValueOnce(new ApiError(403, 'This action is unauthorized.')).mockResolvedValue(fakeGame());
  jest.mocked(gamesApi.join).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByText("You're not on this operation")).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-join-from-lobby'));
  });

  expect(gamesApi.join).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByTestId('roster-1')).toBeOnTheScreen();
});
