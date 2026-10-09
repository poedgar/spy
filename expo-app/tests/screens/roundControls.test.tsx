import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import type { Game, PhraseRound } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/games/[code]/index': Lobby,
  '(app)/index': () => <Text>games</Text>,
  '(app)/spy/index': () => <Text>spy home</Text>,
  '(app)/phrase/index': () => <Text>phrase home</Text>,
};

const players = [
  { id: 100, user: fakeUser, is_host: true, status: 'ready' as const, score: 0, joined_at: null },
  { id: 101, user: otherUser, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
  { id: 102, user: { id: 3, name: 'Cy', codename: 'VIPER_ONE' }, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
];

function deal(overrides: Partial<PhraseRound> = {}): PhraseRound {
  return {
    number: 2,
    language: 'en',
    word_count: 5,
    started_at: new Date().toISOString(),
    ends_at: null,
    ended_at: null,
    my_word: 'louder',
    my_position: 3,
    question_round: 1,
    asker_user_id: otherUser.id,
    turn_order: [1, 2, 3],
    scoring: { win: 3, wrong_guess: -1 },
    guesses: [],
    result: null,
    ...overrides,
  };
}

function phraseGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({ game_type: 'phrase', game_mode: null, phrase_language: 'en', players, player_count: 3, ...overrides });
}

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
});

test('a timed deal counts down, and the host can reveal and end it', async () => {
  const endsAt = new Date(Date.now() + 125_000).toISOString();
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame({ status: 'active', round_seconds: 300, phrase: deal({ ends_at: endsAt }) }));
  jest.mocked(gamesApi.revealPhrase).mockResolvedValue(
    phraseGame({
      status: 'completed',
      phrase: deal({
        ended_at: 'now',
        result: { ending: 'revealed', winner_user_id: null, phrase: 'Actions speak louder than words', words: [] },
      }),
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('round-timer')).toHaveTextContent(/2:0[45]/);
  expect(screen.getByTestId('lobby-meta')).toHaveTextContent(/5 min rounds/);

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-reveal-phrase'));
  });

  expect(gamesApi.revealPhrase).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByText('Nobody guessed it')).toBeOnTheScreen();
  expect(screen.getByTestId('revealed-phrase')).toHaveTextContent('“Actions speak louder than words”');
});

test('earlier rounds are listed when the history is opened', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(
    phraseGame({
      history: [{ number: 1, ending: 'guessed', ended_at: null, phrase: 'Time is money', winner_user_id: otherUser.id }],
    }),
  );
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  fireEvent.press(await screen.findByText(/Previous rounds \(1\)/));

  expect(screen.getByTestId('history-1')).toHaveTextContent(/“Time is money” · NIGHT_HAWK \(Bob\) guessed it/);
});

test('the host closes the game and goes back home', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame());
  jest.mocked(gamesApi.close).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const close = await screen.findByTestId('btn-close-game');
  await act(async () => {
    fireEvent.press(close);
  });

  expect(gamesApi.close).toHaveBeenCalledWith('SPY-AB3D');
  await waitFor(() => expect(screen).toHavePathname('/phrase'));
});

test('a closed game shows a clear message instead of an error', async () => {
  jest.mocked(gamesApi.show).mockRejectedValue(new ApiError(404, 'Not found.'));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByText('That game is no longer available.')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('btn-back-to-games'));
  await waitFor(() => expect(screen).toHavePathname('/'));
});
