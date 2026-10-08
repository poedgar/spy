import { act, fireEvent, screen } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import type { OpenGame } from '@/api/types';
import AppLayout from '../../app/(app)/_layout';
import PhraseHome from '../../app/(app)/phrase/index';
import SpyHome from '../../app/(app)/spy/index';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = { '(app)/_layout': AppLayout, '(app)/spy/index': SpyHome, '(app)/phrase/index': PhraseHome };

function openGame(overrides: Partial<OpenGame> = {}): OpenGame {
  return {
    id: 20,
    code: 'SPY-QR7S',
    title: 'Open Table',
    game_type: 'spy',
    game_mode: 'mole',
    age_tier: 'teens',
    phrase_language: null,
    player_count: 2,
    max_players: 6,
    host_codename: 'NIGHT_HAWK',
    my_request: null,
    ...overrides,
  };
}

test('a player asks to join an open game and can withdraw the request', async () => {
  jest
    .mocked(gamesApi.spyHome)
    .mockResolvedValueOnce({ games: [], pending_invitations: [], open_games: [openGame()] })
    .mockResolvedValue({ games: [], pending_invitations: [], open_games: [openGame({ my_request: 'pending' })] });
  jest
    .mocked(gamesApi.requestToJoin)
    .mockResolvedValue({ status: 'requested', code: 'SPY-QR7S', title: 'Open Table', game_type: 'spy' });
  jest.mocked(gamesApi.cancelJoinRequest).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  expect(await screen.findByTestId('open-game-SPY-QR7S')).toHaveTextContent(/NIGHT_HAWK.*2 \/ 6 players.*The Mole · Teens/);

  const ask = screen.getByTestId('btn-request-SPY-QR7S');
  await act(async () => {
    fireEvent.press(ask);
  });
  expect(gamesApi.requestToJoin).toHaveBeenCalledWith('SPY-QR7S');
  expect(await screen.findByText('Request sent. The host will let you in.')).toBeOnTheScreen();

  const cancel = await screen.findByTestId('btn-cancel-request-SPY-QR7S');
  await act(async () => {
    fireEvent.press(cancel);
  });
  expect(gamesApi.cancelJoinRequest).toHaveBeenCalledWith('SPY-QR7S');
});

test('phrase open games show their language and a declined request can be retried', async () => {
  jest.mocked(gamesApi.phraseHome).mockResolvedValue({
    games: [],
    pending_invitations: [],
    open_games: [openGame({ game_type: 'phrase', game_mode: null, phrase_language: 'uk', my_request: 'declined' })],
  });
  await renderApp(routes, { initialUrl: '/phrase', user: fakeUser });

  expect(await screen.findByTestId('open-game-SPY-QR7S')).toHaveTextContent(/Ukrainian phrases/);
  expect(screen.getByTestId('btn-request-SPY-QR7S')).toHaveTextContent('Ask again');
});

test('with no open games the list says so', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [], pending_invitations: [], open_games: [] });
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  expect(await screen.findByText('No open games right now. Create one and others can find it here.')).toBeOnTheScreen();
});
