import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { googleFirebaseIdToken } from '@/auth/googleSignIn';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';
import Welcome from '../../app/(auth)/welcome';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': Welcome,
  '(auth)/two-factor': () => <Text>two-factor code</Text>,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>choose a game</Text>,
};

async function pressGoogle() {
  const button = await screen.findByTestId('btn-google-sign-in');
  await act(async () => {
    fireEvent.press(button);
  });
}

test('continuing with Google signs in with the Firebase token', async () => {
  jest.mocked(googleFirebaseIdToken).mockResolvedValue('firebase-id-token');
  jest.mocked(authApi.firebase).mockResolvedValue({ token: 'api-token', user: fakeUser });
  await renderApp(routes, { initialUrl: '/welcome' });

  await pressGoogle();

  expect(authApi.firebase).toHaveBeenCalledWith(expect.objectContaining({ id_token: 'firebase-id-token' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByText('choose a game')).toBeOnTheScreen();
});

test('closing the Google picker leaves the player where they were', async () => {
  jest.mocked(googleFirebaseIdToken).mockResolvedValue(null);
  await renderApp(routes, { initialUrl: '/welcome' });

  await pressGoogle();

  expect(authApi.firebase).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/welcome');
});

test('an account with two-factor auth is asked for its code', async () => {
  jest.mocked(googleFirebaseIdToken).mockResolvedValue('firebase-id-token');
  jest.mocked(authApi.firebase).mockResolvedValue({ two_factor: true, challenge: 'abc' });
  await renderApp(routes, { initialUrl: '/welcome' });

  await pressGoogle();

  expect(await screen.findByText('two-factor code')).toBeOnTheScreen();
});
