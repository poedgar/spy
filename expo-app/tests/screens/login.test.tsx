import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';
import Login from '../../app/(auth)/login';
import TwoFactor from '../../app/(auth)/two-factor';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': Login,
  '(auth)/two-factor': TwoFactor,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
};

async function submitLogin() {
  fireEvent.changeText(screen.getByTestId('input-email'), 'ada@example.com');
  fireEvent.changeText(screen.getByTestId('input-password'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-login'));
  });
}

test('a successful login lands on the game picker', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();

  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('a 2FA user is taken to the code screen and completes sign-in', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ two_factor: true, challenge: 'c'.repeat(40) });
  jest.mocked(authApi.twoFactor).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();
  await waitFor(() => expect(screen).toHavePathname('/two-factor'));

  fireEvent.changeText(screen.getByTestId('input-2fa-code'), '123456');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-2fa-submit'));
  });

  expect(authApi.twoFactor).toHaveBeenCalledWith({ challenge: 'c'.repeat(40), code: '123456' });
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('invalid credentials show the field error', async () => {
  jest.mocked(authApi.login).mockRejectedValue(new ValidationError('x', { email: ['These credentials do not match our records.'] }));
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();

  expect(await screen.findByText('These credentials do not match our records.')).toBeOnTheScreen();
});
