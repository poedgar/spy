import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import SpyHome from '../../app/(app)/spy/index';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/index': SpyHome,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

const invitation = { id: 5, status: 'pending' as const, game_title: 'Op Sunrise', game_code: 'SPY-ZZ22', from_codename: 'NIGHT_HAWK', created_at: null };

test('lists operations and pending invitations, highlighting the pushed one', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [fakeGame()], pending_invitations: [invitation] });

  await renderApp(routes, { initialUrl: '/spy?highlight=5', user: fakeUser });

  expect(await screen.findByText('Operation Nightfall')).toBeOnTheScreen();
  expect(screen.getByText('NIGHT_HAWK invited you to Op Sunrise')).toBeOnTheScreen();
  expect(screen.getByTestId('invitation-5')).toHaveStyle({ borderWidth: 2 });
});

test('accepting an invitation opens its lobby', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [], pending_invitations: [invitation] });
  jest.mocked(gamesApi.accept).mockResolvedValue(fakeGame({ code: 'SPY-ZZ22' }));
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  const button = await screen.findByTestId('btn-accept-5');
  await act(async () => {
    fireEvent.press(button);
  });

  await waitFor(() => expect(screen).toHavePathname('/games/SPY-ZZ22'));
});

test('declining removes the invitation after refetch', async () => {
  jest.mocked(gamesApi.spyHome)
    .mockResolvedValueOnce({ games: [], pending_invitations: [invitation] })
    .mockResolvedValue({ games: [], pending_invitations: [] });
  jest.mocked(gamesApi.decline).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  const button = await screen.findByTestId('btn-decline-5');
  await act(async () => {
    fireEvent.press(button);
  });

  await waitFor(() => expect(screen.queryByTestId('invitation-5')).toBeNull());
});
