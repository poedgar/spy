import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import type { Game, SongRound } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/index': Lobby };
const thirdUser = { id: 3, name: 'Cy', codename: 'VIPER_ONE' };
const players = [fakeUser, otherUser, thirdUser].map((user, index) => ({
  id: 100 + index,
  user,
  is_host: index === 0,
  status: 'ready' as const,
  joined_at: null,
}));

function round(overrides: Partial<SongRound> = {}): SongRound {
  return {
    number: 1,
    clip_url: 'https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ?start=60&end=75&rel=0&playsinline=1',
    turn_order: [1, 2, 3],
    singer_user_id: 1,
    sung_count: 0,
    voted_user_ids: [],
    my_vote: null,
    scoring: { win: 1 },
    started_at: 'now',
    voting_started_at: null,
    ended_at: null,
    result: null,
    ...overrides,
  };
}

function songGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({ game_type: 'song', game_mode: null, mission_briefing: null, players, player_count: 3, ...overrides });
}

test('the singer hears the clip and ends their turn', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(songGame({ status: 'active', song: round() }));
  jest.mocked(gamesApi.passSingTurn).mockResolvedValue(songGame({ status: 'active', song: round({ singer_user_id: 2, sung_count: 1 }) }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('clip-player')).toBeOnTheScreen();
  expect(screen.getByTestId('current-singer')).toHaveTextContent('Your turn: sing how the clip goes on!');

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-done-singing'));
  });
  expect(gamesApi.passSingTurn).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByText('NIGHT_HAWK (Bob) is singing.')).toBeOnTheScreen();
});

test('everyone votes for someone else, and the results reveal the song', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(songGame({ status: 'voting', song: round({ singer_user_id: null, sung_count: 3 }) }));
  jest.mocked(gamesApi.voteForSinger).mockResolvedValue(
    songGame({
      status: 'completed',
      song: round({
        singer_user_id: null,
        sung_count: 3,
        ended_at: 'now',
        result: {
          ending: 'voted',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          winner_user_ids: [2],
          votes: [
            { user_id: 1, votes: 0 },
            { user_id: 2, votes: 2 },
            { user_id: 3, votes: 1 },
          ],
        },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const voting = within(await screen.findByTestId('voting-card'));
  expect(voting.queryByTestId('btn-vote-1')).toBeNull();
  await act(async () => {
    fireEvent.press(voting.getByTestId('btn-vote-2'));
  });

  expect(gamesApi.voteForSinger).toHaveBeenCalledWith('SPY-AB3D', 2);
  expect(await screen.findByTestId('song-title')).toHaveTextContent('“Bohemian Rhapsody” — Queen');
});
