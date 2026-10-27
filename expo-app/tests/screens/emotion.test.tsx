import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import type { EmotionRound, Game } from '@/api/types';
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

function round(overrides: Partial<EmotionRound> = {}): EmotionRound {
  return {
    number: 1,
    level: 1,
    image_url: 'https://marvelous-games.test/emotions/u01-fear-terror.jpg',
    options: ['joy', 'fear', 'anger', 'neutral'],
    answered_user_ids: [],
    my_answer: null,
    scoring: { win: 1 },
    started_at: 'now',
    ended_at: null,
    result: null,
    ...overrides,
  };
}

function emotionGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({
    game_type: 'emotion',
    game_mode: null,
    mission_briefing: null,
    emotion_level: 1,
    players,
    player_count: 3,
    ...overrides,
  });
}

test('everyone sees the face and picks an emotion from the options', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(emotionGame({ status: 'active', emotion: round({ answered_user_ids: [2] }) }));
  jest.mocked(gamesApi.answerEmotion).mockResolvedValue(
    emotionGame({ status: 'active', emotion: round({ answered_user_ids: [2, 1], my_answer: 'fear' }) }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('face-image')).toBeOnTheScreen();
  expect(screen.getByTestId('lobby-meta')).toHaveTextContent('Name the Emotion · Easy', { exact: false });
  const options = within(screen.getByTestId('emotion-options'));
  expect(options.getAllByRole('button')).toHaveLength(4);
  expect(screen.getByTestId('btn-reveal-emotion')).toBeOnTheScreen();

  await act(async () => {
    fireEvent.press(options.getByTestId('btn-emotion-fear'));
  });

  expect(gamesApi.answerEmotion).toHaveBeenCalledWith('SPY-AB3D', 'fear');
  expect(await screen.findByText('✓ Fear')).toBeOnTheScreen();
});

test('after the reveal everyone sees the answer, who picked what, and how recognisable the face is', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(
    emotionGame({
      status: 'completed',
      emotion: round({
        my_answer: 'anger',
        ended_at: 'now',
        result: {
          ending: 'revealed',
          emotion: 'fear',
          variant: 'Terror',
          answers: [
            { user_id: 1, emotion: 'anger', correct: false },
            { user_id: 2, emotion: 'fear', correct: true },
            { user_id: 3, emotion: 'fear', correct: true },
          ],
          hit_rate: 0.82,
          answers_so_far: 45,
        },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const result = within(await screen.findByTestId('emotion-result'));
  expect(result.getByText('It was Fear.')).toBeOnTheScreen();
  expect(result.getByTestId('my-verdict')).toHaveTextContent('You picked Anger.');
  expect(result.getByText(/Fear: NIGHT_HAWK \(Bob\), VIPER_ONE \(Cy\)/)).toBeOnTheScreen();
  expect(result.getByTestId('face-hit-rate')).toHaveTextContent('Across all games, 82% of 45 answers named this face right.');
  expect(screen.getByTestId('btn-start-emotion')).toHaveTextContent('Next face');
  expect(screen.getByTestId('face-credit')).toBeOnTheScreen();
});
