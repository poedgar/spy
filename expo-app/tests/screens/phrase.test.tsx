import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import type { Game, PhraseRound } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import PhraseCreate from '../../app/(app)/phrase/create';
import PhraseHome from '../../app/(app)/phrase/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/phrase/index': PhraseHome,
  '(app)/phrase/create': PhraseCreate,
  '(app)/games/[code]/index': Lobby,
  '(app)/games/[code]/invite': () => <Text>invite</Text>,
};

const thirdUser = { id: 3, name: 'Cy', codename: 'VIPER_ONE' };
const players = [
  { id: 100, user: fakeUser, is_host: true, status: 'ready' as const, score: 0, joined_at: null },
  { id: 101, user: otherUser, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
  { id: 102, user: thirdUser, is_host: false, status: 'ready' as const, score: 0, joined_at: null },
];

function deal(overrides: Partial<PhraseRound> = {}): PhraseRound {
  return {
    number: 1,
    language: 'en',
    word_count: 5,
    started_at: '2026-10-08T10:00:00Z',
    ended_at: null,
    my_word: 'louder',
    my_position: 3,
    question_round: 1,
    asker_user_id: fakeUser.id,
    turn_order: [1, 2, 3],
    scoring: { win: 3, wrong_guess: -1 },
    guesses: [],
    result: null,
    ...overrides,
  };
}

function phraseGame(overrides: Partial<Game> = {}): Game {
  return fakeGame({
    game_type: 'phrase',
    game_mode: null,
    phrase_language: 'en',
    title: 'Word Play',
    players,
    player_count: 3,
    min_players: 3,
    ...overrides,
  });
}

test('the phrase home lists phrase games and opens the create form', async () => {
  jest.mocked(gamesApi.phraseHome).mockResolvedValue({ games: [phraseGame()], pending_invitations: [] });
  await renderApp(routes, { initialUrl: '/phrase', user: fakeUser });

  expect(await screen.findByTestId('game-SPY-AB3D')).toHaveTextContent(/Word Play/);
  fireEvent.press(screen.getByTestId('btn-open-create-phrase'));
  await waitFor(() => expect(screen).toHavePathname('/phrase/create'));
});

test('creating a phrase game sends the language and table size', async () => {
  jest.mocked(gamesApi.createPhrase).mockResolvedValue(phraseGame());
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame());
  await renderApp(routes, { initialUrl: '/phrase/create', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-phrase-title'), 'Word Play');
  fireEvent.press(screen.getByTestId('phrase-language-uk'));
  for (let i = 0; i < 10; i++) fireEvent.press(screen.getByTestId('btn-players-plus'));
  expect(screen.getByTestId('players-count')).toHaveTextContent('10');

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-create-phrase'));
  });

  expect(gamesApi.createPhrase).toHaveBeenCalledWith({ title: 'Word Play', phrase_language: 'uk', max_players: 10 });
  await waitFor(() => expect(screen).toHavePathname('/games/SPY-AB3D'));
});

test('the lobby route renders the phrase lobby, and the host deals', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame());
  jest.mocked(gamesApi.startPhrase).mockResolvedValue(phraseGame({ status: 'active', phrase: deal() }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const start = await screen.findByTestId('btn-start-phrase');
  await act(async () => {
    fireEvent.press(start);
  });

  expect(gamesApi.startPhrase).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByTestId('word-card')).toBeOnTheScreen();
  expect(screen.queryByTestId('my-word')).toBeNull();

  fireEvent.press(screen.getByTestId('btn-reveal-word'));
  expect(screen.getByTestId('my-word')).toHaveTextContent('louder');
  expect(screen.getByText('Your word is number 3 of 5')).toBeOnTheScreen();
});

test('the asker passes the turn on', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame({ status: 'active', phrase: deal() }));
  jest
    .mocked(gamesApi.passTurn)
    .mockResolvedValue(phraseGame({ status: 'active', phrase: deal({ asker_user_id: otherUser.id }) }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('current-asker')).toHaveTextContent(/Your turn/);
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-pass-turn'));
  });

  expect(gamesApi.passTurn).toHaveBeenCalledWith('SPY-AB3D');
  await waitFor(() =>
    expect(screen.getByTestId('current-asker')).toHaveTextContent('NIGHT_HAWK (Bob) is asking a question.'),
  );
});

test('a wrong guess is announced, a right one reveals the phrase', async () => {
  const wrong = phraseGame({
    status: 'active',
    phrase: deal({ guesses: [{ user_id: 1, guess: 'nope', correct: false }] }),
  });
  const won = phraseGame({
    status: 'completed',
    phrase: deal({
      ended_at: '2026-10-08T10:05:00Z',
      guesses: [{ user_id: 1, guess: 'actions speak louder than words', correct: true }],
      result: {
        ending: 'guessed',
        winner_user_id: 1,
        phrase: 'Actions speak louder than words',
        words: [
          { position: 1, word: 'Actions', user_id: 2 },
          { position: 2, word: 'speak', user_id: null },
          { position: 3, word: 'louder', user_id: 1 },
          { position: 4, word: 'than', user_id: 3 },
          { position: 5, word: 'words', user_id: null },
        ],
      },
    }),
  });
  jest.mocked(gamesApi.show).mockResolvedValue(phraseGame({ status: 'active', phrase: deal() }));
  jest
    .mocked(gamesApi.guessPhrase)
    .mockResolvedValueOnce({ correct: false, game: wrong })
    .mockResolvedValueOnce({ correct: true, game: won });
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-phrase-guess'), 'nope');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-guess-phrase'));
  });
  expect(await screen.findByText('Not quite. That cost you a point.')).toBeOnTheScreen();
  await waitFor(() => expect(screen.getByTestId('guess-log')).toHaveTextContent(/nope/));

  fireEvent.changeText(screen.getByTestId('input-phrase-guess'), 'actions speak louder than words');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-guess-phrase'));
  });

  expect(gamesApi.guessPhrase).toHaveBeenLastCalledWith('SPY-AB3D', 'actions speak louder than words');
  expect(await screen.findByTestId('revealed-phrase')).toHaveTextContent('“Actions speak louder than words”');
  expect(screen.getByTestId('btn-start-phrase')).toHaveTextContent('Deal the next phrase');
});
