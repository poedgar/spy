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
    prompt: 'Better late than…',
    max_length: 150,
    min_answers: 2,
    image_url: null,
    credit: null,
    source_url: null,
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

function finishGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({
    game_type: 'finish',
    game_mode: null,
    mission_briefing: null,
    phrase_language: 'en',
    players,
    player_count: 3,
    ...overrides,
  });
}

const answers = [
  { position: 0, text: 'never on Mondays', mine: false, user_id: null, votes: null },
  { position: 1, text: 'in pyjamas', mine: true, user_id: null, votes: null },
  { position: 2, text: 'the bus', mine: false, user_id: null, votes: null },
];

test('everyone sees the beginning and sends an ending', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(finishGame({ status: 'active', finish: round({ answered_user_ids: [2] }) }));
  jest.mocked(gamesApi.submitEnding).mockResolvedValue(
    finishGame({ status: 'active', finish: round({ answered_user_ids: [2, 1], my_answer: 'in pyjamas' }) }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('prompt-text')).toHaveTextContent('Better late than…');
  expect(screen.getByTestId('btn-open-vote')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByTestId('input-ending'), '  in pyjamas ');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-send-ending'));
  });

  expect(gamesApi.submitEnding).toHaveBeenCalledWith('SPY-AB3D', 'in pyjamas');
  expect(await screen.findByTestId('ending-sent')).toBeOnTheScreen();
  expect(screen.getByText('Update my ending')).toBeOnTheScreen();
});

test('the vote lists endings without names; your own cannot be chosen; results name the authors', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(
    finishGame({ status: 'voting', finish: round({ answered_user_ids: [1, 2, 3], answers, voting_started_at: 'now' }) }),
  );
  jest.mocked(gamesApi.voteForEnding).mockResolvedValue(
    finishGame({
      status: 'completed',
      finish: round({
        answered_user_ids: [1, 2, 3],
        voting_started_at: 'now',
        ended_at: 'now',
        answers: [
          { ...answers[0], user_id: 3, votes: 0 },
          { ...answers[1], user_id: 1, votes: 1 },
          { ...answers[2], user_id: 2, votes: 2 },
        ],
        result: { ending: 'voted', meaning: null, winner_user_ids: [2] },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const voting = within(await screen.findByTestId('voting-card'));
  expect(voting.queryByText(/NIGHT_HAWK/)).toBeNull();
  expect(voting.getByTestId('btn-vote-1')).toBeDisabled();

  await act(async () => {
    fireEvent.press(voting.getByTestId('btn-vote-2'));
  });

  expect(gamesApi.voteForEnding).toHaveBeenCalledWith('SPY-AB3D', 2);
  const results = await screen.findByTestId('finish-results');
  expect(results).toHaveTextContent('NIGHT_HAWK (Bob) wrote the best ending!', { exact: false });
  expect(results).toHaveTextContent('Better late than… the bus — NIGHT_HAWK (Bob) · 2 votes', { exact: false });
});
