import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import CreateGame from '../../app/(app)/spy/create';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/create': CreateGame,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

test('creates an operation with the chosen settings and opens the lobby', async () => {
  jest.mocked(gamesApi.create).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-game-title'), 'Operation Nightfall');
  fireEvent.press(screen.getByTestId('mode-codebreaker'));
  fireEvent.press(screen.getByTestId('btn-players-plus'));
  fireEvent.changeText(screen.getByTestId('input-mission-briefing'), 'Find the mole.');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-create-game'));
  });

  expect(gamesApi.create).toHaveBeenCalledWith({
    title: 'Operation Nightfall',
    game_mode: 'codebreaker',
    max_players: 7,
    mission_briefing: 'Find the mole.',
  });
  await waitFor(() => expect(screen).toHavePathname('/games/SPY-AB3D'));
});

test('player count stays within 3 to 12', async () => {
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });
  await screen.findByTestId('players-count');

  for (let i = 0; i < 10; i++) fireEvent.press(screen.getByTestId('btn-players-plus'));
  expect(screen.getByTestId('players-count')).toHaveTextContent('12');

  for (let i = 0; i < 15; i++) fireEvent.press(screen.getByTestId('btn-players-minus'));
  expect(screen.getByTestId('players-count')).toHaveTextContent('3');
});

test('server field errors show on the form', async () => {
  jest.mocked(gamesApi.create).mockRejectedValue(
    new ValidationError('x', { title: ['The title field is required.'], mission_briefing: ['The mission briefing field is required.'] }),
  );
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });

  const button = await screen.findByTestId('btn-create-game');
  await act(async () => {
    fireEvent.press(button);
  });

  expect(await screen.findByText('The title field is required.')).toBeOnTheScreen();
  expect(screen.getByText('The mission briefing field is required.')).toBeOnTheScreen();
});
