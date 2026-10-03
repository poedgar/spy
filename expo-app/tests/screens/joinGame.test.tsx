import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError, ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import JoinGame from '../../app/(app)/spy/join';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/join': JoinGame,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

async function submit() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-join-game'));
  });
}

test('trims and uppercases the code before joining', async () => {
  jest.mocked(gamesApi.join).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/spy/join', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-join-code'), '  spy-ab3d ');
  await submit();

  expect(gamesApi.join).toHaveBeenCalledWith('SPY-AB3D');
  await waitFor(() => expect(screen).toHavePathname('/games/SPY-AB3D'));
});

test('a deep-linked code is pre-filled and waits for confirmation', async () => {
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-AB3D', user: fakeUser });

  expect(await screen.findByDisplayValue('SPY-AB3D')).toBeOnTheScreen();
  expect(screen.getByText('Join operation SPY-AB3D?')).toBeOnTheScreen();
  expect(gamesApi.join).not.toHaveBeenCalled();
});

test('a full roster shows the server message', async () => {
  jest.mocked(gamesApi.join).mockRejectedValue(new ValidationError('x', { code: ['This operation roster is already full.'] }));
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-AB3D', user: fakeUser });
  await screen.findByTestId('btn-join-game');

  await submit();

  expect(await screen.findByText('This operation roster is already full.')).toBeOnTheScreen();
});

test('an unknown code shows the web wording', async () => {
  jest.mocked(gamesApi.join).mockRejectedValue(new ApiError(404, 'Not Found'));
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-ZZZZ', user: fakeUser });
  await screen.findByTestId('btn-join-game');

  await submit();

  expect(await screen.findByText('No operation found with that invite code.')).toBeOnTheScreen();
});

test('a malformed code is rejected before calling the API', async () => {
  await renderApp(routes, { initialUrl: '/spy/join', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-join-code'), 'hello');
  await submit();

  expect(gamesApi.join).not.toHaveBeenCalled();
  expect(await screen.findByText('Invite codes look like SPY-AB3D.')).toBeOnTheScreen();
});
