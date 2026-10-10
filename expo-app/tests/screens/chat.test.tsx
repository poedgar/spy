import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import type { FakeEcho } from '../support/fakeEcho';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/index': Lobby };
const message = (id: number, user = otherUser, body = 'Hi all') => ({ id, body, created_at: null, user: { ...user, name: user.name } });

test('players see the lobby chat, send messages, and get new ones live', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame());
  jest.mocked(gamesApi.messages).mockResolvedValue([message(1)]);
  jest.mocked(gamesApi.postMessage).mockResolvedValue(message(2, fakeUser, 'Ready!'));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const chat = within(await screen.findByTestId('chat-panel'));
  expect(await chat.findByText('Hi all')).toBeOnTheScreen();

  fireEvent.changeText(chat.getByTestId('input-chat'), '  Ready!  ');
  await act(async () => {
    fireEvent.press(chat.getByTestId('btn-chat-send'));
  });
  expect(gamesApi.postMessage).toHaveBeenCalledWith('SPY-AB3D', 'Ready!');
  expect(await chat.findByText('Ready!')).toBeOnTheScreen();

  await act(async () => {
    echo.emit('private-game.10', '.chat.message', { message: message(3, otherUser, 'Starting soon?') });
  });
  expect(await chat.findByText('Starting soon?')).toBeOnTheScreen();
});

test('an empty chat invites the first message', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByText('No messages yet. Say hello!')).toBeOnTheScreen();
});
