import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { AudioSession } from '@livekit/react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const livekit = jest.requireMock<{
  __local: { setMicrophoneEnabled: jest.Mock };
  __setParticipants(next: unknown[]): void;
}>('@livekit/react-native');

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/index': Lobby };
const access = { url: 'wss://example.livekit.cloud', token: 'jwt', room: 'game-10' };

test('voice chat is offered only when the server has it set up', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame({ voice_enabled: false }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('lobby-meta');
  expect(screen.queryByTestId('voice-panel')).toBeNull();
});

test('a player joins voice, sees who is in it, and can mute', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame({ voice_enabled: true }));
  jest.mocked(gamesApi.voice).mockResolvedValue(access);
  livekit.__setParticipants([
    { identity: '1', name: 'SHADOW_FOX', isMicrophoneEnabled: true },
    { identity: '2', name: otherUser.codename, isMicrophoneEnabled: false },
  ]);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const joinButton = await screen.findByTestId('btn-voice-join');
  await act(async () => {
    fireEvent.press(joinButton);
  });

  expect(gamesApi.voice).toHaveBeenCalledWith('SPY-AB3D');
  expect(AudioSession.startAudioSession).toHaveBeenCalled();
  const members = within(await screen.findByTestId('voice-members'));
  expect(members.getByText('SHADOW_FOX (you)')).toBeOnTheScreen();
  expect(members.getByText(/NIGHT_HAWK/)).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('btn-voice-mic'));
  expect(livekit.__local.setMicrophoneEnabled).toHaveBeenCalledWith(false);

  fireEvent.press(screen.getByTestId('btn-voice-leave'));
  expect(await screen.findByTestId('btn-voice-join')).toBeOnTheScreen();
});

test('if the server refuses, the reason is shown and nothing connects', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame({ voice_enabled: true }));
  jest.mocked(gamesApi.voice).mockRejectedValue(new ApiError(404, 'Voice chat is not set up.'));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  const joinButton = await screen.findByTestId('btn-voice-join');
  await act(async () => {
    fireEvent.press(joinButton);
  });

  expect(await screen.findByText('Voice chat is not set up.')).toBeOnTheScreen();
  expect(AudioSession.startAudioSession).not.toHaveBeenCalled();
});
