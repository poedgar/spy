import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import type { Game, Round } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import Locations from '../../app/(app)/locations';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { answerDialog } from '../support/dialog';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/games/[code]/index': Lobby,
  '(app)/locations': Locations,
  '(app)/spy/index': () => <Text>spy home</Text>,
};

const thirdUser = { id: 3, name: 'Cy', codename: 'VIPER_ONE' };
const church = { id: 1, en: 'Church', uk: 'Церква', category: 'historical' };

const players = [
  { id: 100, user: fakeUser, is_host: true, status: 'ready' as const, score: 0, joined_at: null },
  { id: 101, user: otherUser, is_host: false, status: 'ready' as const, score: 2, joined_at: null },
  { id: 102, user: thirdUser, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
];

function round(overrides: Partial<Round> = {}): Round {
  return {
    number: 1,
    spy_count: 1,
    started_at: '2026-10-07T10:00:00Z',
    ends_at: null,
    voting_started_at: null,
    ended_at: null,
    my_role: 'loyalist',
    location: church,
    voted_user_ids: [],
    my_vote: null,
    result: null,
    ...overrides,
  };
}

function game(overrides: Partial<Game> = {}): Game {
  return fakeGame({ players, player_count: 3, min_players: 3, spy_count: 1, age_tier: 'adults', ...overrides });
}

test('the host starts the game once enough operatives have joined', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game());
  jest.mocked(gamesApi.startRound).mockResolvedValue(game({ status: 'active', round: round() }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const startButton = await screen.findByTestId('btn-start-round');
  await act(async () => {
    fireEvent.press(startButton);
  });

  expect(gamesApi.startRound).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByTestId('role-card')).toBeOnTheScreen();
  expect(screen.getByTestId('btn-start-voting')).toBeOnTheScreen();
});

test('start is disabled below the minimum roster', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game({ players: players.slice(0, 2), player_count: 2 }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('btn-start-round')).toBeDisabled();
  expect(screen.getByText('At least 3 players are required to start.')).toBeOnTheScreen();
});

test('a loyalist reveals the location only on request', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game({ status: 'active', round: round() }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('role-card');
  expect(screen.queryByTestId('secret-location')).toBeNull();

  fireEvent.press(screen.getByTestId('btn-reveal-role'));
  expect(screen.getByTestId('secret-location')).toHaveTextContent('Church');
});

test('a spy stakes the round on a location from the guide', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game({ status: 'active', round: round({ my_role: 'spy', location: null }) }));
  jest.mocked(gamesApi.locations).mockResolvedValue({
    tier: 'adults',
    categories: { historical: { en: 'Historical & Sacred', uk: 'Історичні та сакральні місця' } },
    locations: [church],
  });
  jest.mocked(gamesApi.guess).mockResolvedValue({ correct: true, game: game({ status: 'completed' }) });
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  fireEvent.press(await screen.findByTestId('btn-reveal-role'));
  expect(screen.getByTestId('role-spy')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('btn-guess-location'));

  const place = await screen.findByTestId('location-1');
  await act(async () => {
    fireEvent.press(place);
  });
  await answerDialog('Guess the location');

  expect(gamesApi.guess).toHaveBeenCalledWith('SPY-AB3D', 1);
  expect(await screen.findByText('Correct! The spies win the round.')).toBeOnTheScreen();
});

test('players vote during the voting phase and see who has voted', async () => {
  const voting = game({ status: 'voting', round: round({ voted_user_ids: [3] }) });
  jest.mocked(gamesApi.show).mockResolvedValue(voting);
  jest.mocked(gamesApi.vote).mockResolvedValue(
    game({ status: 'voting', round: round({ voted_user_ids: [3, 1], my_vote: 2 }) }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('votes-cast')).toHaveTextContent('1 of 3 votes cast');
  expect(screen.queryByTestId('suspect-1')).toBeNull(); // no voting for yourself

  await act(async () => {
    fireEvent.press(screen.getByTestId('suspect-2'));
  });

  expect(gamesApi.vote).toHaveBeenCalledWith('SPY-AB3D', 2);
  await waitFor(() => expect(screen.getByTestId('votes-cast')).toHaveTextContent('2 of 3 votes cast'));
  expect(screen.getByTestId('suspect-2')).toBeSelected();
});

test('results reveal the spies, the votes and the scores', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(
    game({
      status: 'completed',
      round: round({
        ended_at: '2026-10-07T10:10:00Z',
        result: {
          ending: 'vote',
          winning_team: 'loyalists',
          spy_user_ids: [2],
          accused_user_id: 2,
          guessed_by_user_id: null,
          guessed_location: null,
          votes: [
            { voter_id: 1, suspect_id: 2 },
            { voter_id: 3, suspect_id: 2 },
          ],
          vote_counts: { 2: 2 },
        },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('round-summary')).toHaveTextContent('NIGHT_HAWK (Bob) was a spy. The loyalists win!');
  expect(screen.getByTestId('score-2')).toHaveTextContent('2 pts');
  expect(screen.getByTestId('btn-start-round')).toHaveTextContent('Start next round');
});

test('a game rule error from the server is shown as a banner', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game());
  jest
    .mocked(gamesApi.startRound)
    .mockRejectedValue(new ValidationError('A round is already in progress.', { game: ['A round is already in progress.'] }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const startButton = await screen.findByTestId('btn-start-round');
  await act(async () => {
    fireEvent.press(startButton);
  });

  expect(await screen.findByText('A round is already in progress.')).toBeOnTheScreen();
});

test('a non-host can leave a recruiting game', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(game({ host_id: otherUser.id, host: otherUser }));
  jest.mocked(gamesApi.leave).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const leaveButton = await screen.findByTestId('btn-leave-game');
  await act(async () => {
    fireEvent.press(leaveButton);
  });
  await answerDialog('Confirm');

  expect(gamesApi.leave).toHaveBeenCalledWith('SPY-AB3D');
  await waitFor(() => expect(screen).toHavePathname('/spy'));
});

test('a game.updated event refetches the lobby', async () => {
  jest.mocked(gamesApi.show).mockResolvedValueOnce(game()).mockResolvedValue(game({ status: 'active', round: round() }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('btn-start-round');
  await waitFor(() => expect(echo.private).toHaveBeenCalledWith('game.10'));
  act(() => echo.emit('private-game.10', '.game.updated', { game_id: 10, status: 'active' }));

  expect(await screen.findByTestId('role-card')).toBeOnTheScreen();
});
