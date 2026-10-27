import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import type { FinishRound, Game } from '@/api/types';
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

function round(overrides: Partial<FinishRound> = {}): FinishRound {
  return {
    number: 1,
    prompt: 'A tabby cat with wide, shocked eyes',
    max_length: 150,
    min_answers: 2,
    image_url: 'https://marvelous-games.test/memes/meme-surprised-young-cat.jpg',
    credit: 'Tilman Piesk, CC BY 3.0',
    source_url: 'https://commons.wikimedia.org/wiki/File:Surprised_young_cat.JPG',
    answered_user_ids: [],
    my_answer: null,
    answers: null,
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

function memeGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({ game_type: 'meme', game_mode: null, mission_briefing: null, phrase_language: null, players, player_count: 3, ...overrides });
}

test('the caption shows on the picture while typing, and the photo is credited', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(memeGame({ status: 'active', finish: round() }));
  jest.mocked(gamesApi.submitEnding).mockResolvedValue(
    memeGame({ status: 'active', finish: round({ answered_user_ids: [1], my_answer: 'when the wifi drops' }) }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('meme-picture')).toBeOnTheScreen();
  expect(screen.getByTestId('lobby-meta')).not.toHaveTextContent('English', { exact: false });
  expect(screen.getByTestId('meme-credit')).toHaveTextContent('Photo: Tilman Piesk, CC BY 3.0');
  expect(screen.queryByTestId('meme-picture-caption')).toBeNull();

  fireEvent.changeText(screen.getByTestId('input-ending'), 'when the wifi drops');
  expect(within(screen.getByTestId('meme-picture-caption')).getAllByText('WHEN THE WIFI DROPS').length).toBeGreaterThan(0);

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-send-ending'));
  });
  expect(gamesApi.submitEnding).toHaveBeenCalledWith('SPY-AB3D', 'when the wifi drops');
  expect(await screen.findByText('Update my caption')).toBeOnTheScreen();
});

test('everyone votes on the memes without names; your own cannot be chosen', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(
    memeGame({
      status: 'voting',
      finish: round({
        answered_user_ids: [1, 2, 3],
        voting_started_at: 'now',
        answers: [
          { position: 0, text: 'monday morning', mine: false, user_id: null, votes: null },
          { position: 1, text: 'when the wifi drops', mine: true, user_id: null, votes: null },
        ],
      }),
    }),
  );
  jest.mocked(gamesApi.voteForEnding).mockResolvedValue(memeGame({ status: 'voting', finish: round({ my_vote: 0 }) }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const voting = within(await screen.findByTestId('voting-card'));
  expect(voting.getByText('Which meme is the best?')).toBeOnTheScreen();
  expect(voting.getByTestId('btn-vote-1')).toBeDisabled();
  expect(voting.queryByText(/NIGHT_HAWK/)).toBeNull();

  await act(async () => {
    fireEvent.press(voting.getByTestId('btn-vote-0'));
  });
  expect(gamesApi.voteForEnding).toHaveBeenCalledWith('SPY-AB3D', 0);
});
