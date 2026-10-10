import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import Invite from '../../app/(app)/games/[code]/invite';
import { fakeUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/invite': Invite };

test('lists online users first and re-sorts live; invites and shows Pending', async () => {
  jest.mocked(gamesApi.invitableUsers)
    .mockResolvedValueOnce([
      { id: 2, name: 'Alpha', codename: 'NIGHT_HAWK', online: false, invite_status: null },
      { id: 3, name: 'Bravo', codename: 'VIPER_ONE', online: false, invite_status: null },
    ])
    .mockResolvedValue([
      { id: 2, name: 'Alpha', codename: 'NIGHT_HAWK', online: false, invite_status: null },
      { id: 3, name: 'Bravo', codename: 'VIPER_ONE', online: false, invite_status: 'pending' },
    ]);
  jest.mocked(gamesApi.invite).mockResolvedValue({ id: 1, status: 'pending', game_title: 'X', game_code: 'SPY-AB3D', from_codename: 'SHADOW_FOX', created_at: null });
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D/invite', user: fakeUser });

  await screen.findByTestId('invitable-2');
  const order = () => screen.getAllByTestId(/^invitable-/).map((node) => node.props.testID);
  expect(order()).toEqual(['invitable-2', 'invitable-3']);

  act(() => echo.presence.here([{ id: 3 }]));
  expect(order()).toEqual(['invitable-3', 'invitable-2']);

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-invite-3'));
  });

  expect(gamesApi.invite).toHaveBeenCalledWith('SPY-AB3D', 3);
  expect(await within(screen.getByTestId('invitable-3')).findByText('Pending')).toBeOnTheScreen();
});

test('players the server saw recently count as online without realtime', async () => {
  jest.mocked(gamesApi.invitableUsers).mockResolvedValue([
    { id: 2, name: 'Alpha', codename: 'NIGHT_HAWK', online: false, invite_status: null },
    { id: 3, name: 'Bravo', codename: 'VIPER_ONE', online: true, invite_status: null },
  ]);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D/invite', user: fakeUser });

  await screen.findByTestId('invitable-3');
  const order = screen.getAllByTestId(/^invitable-/).map((node) => node.props.testID);
  expect(order).toEqual(['invitable-3', 'invitable-2']);
});
