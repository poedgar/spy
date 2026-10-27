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
    prompt: 'Break the ice',
    max_length: 150,
    min_answers: 2,
    image_url: null,
    credit: null,
    source_url: null,
    answered_user_ids: [1, 2, 3],
    my_answer: 'smash a frozen lake',
    answers: [
      { position: 0, text: 'start a conversation', mine: false, user_id: null, votes: null },
      { position: 1, text: 'smash a frozen lake', mine: true, user_id: null, votes: null },
    ],
    voted_user_ids: [],
    my_vote: null,
    scoring: { win: 1 },
    started_at: 'now',
    voting_started_at: 'now',
    ended_at: null,
    result: null,
    ...overrides,
  };
}

function meaningGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({
    game_type: 'meaning',
    game_mode: null,
    mission_briefing: null,
    phrase_language: 'en',
    players,
    player_count: 3,
    ...overrides,
  });
}

test('players vote on interpretations, then see what the idiom really means', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(meaningGame({ status: 'voting', finish: round() }));
  jest.mocked(gamesApi.voteForEnding).mockResolvedValue(
    meaningGame({
      status: 'completed',
      finish: round({
        ended_at: 'now',
        answers: [
          { position: 0, text: 'start a conversation', mine: false, user_id: 2, votes: 2 },
          { position: 1, text: 'smash a frozen lake', mine: true, user_id: 1, votes: 0 },
        ],
        result: { ending: 'voted', meaning: 'To make people feel relaxed when they first meet.', winner_user_ids: [2] },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByText('Which interpretation is the best?')).toBeOnTheScreen();
  const voting = within(screen.getByTestId('voting-card'));
  // Interpretations stand alone, without the phrase in front.
  expect(voting.getByTestId('btn-vote-0')).toHaveTextContent('start a conversation');

  await act(async () => {
    fireEvent.press(voting.getByTestId('btn-vote-0'));
  });

  expect(gamesApi.voteForEnding).toHaveBeenCalledWith('SPY-AB3D', 0);
  const results = await screen.findByTestId('finish-results');
  expect(results).toHaveTextContent('NIGHT_HAWK (Bob) gave the best interpretation!', { exact: false });
  expect(screen.getByTestId('real-meaning')).toHaveTextContent(
    'What it really means: To make people feel relaxed when they first meet.',
  );
});
