import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';
import Register from '../../app/(auth)/register';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/register': Register,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
};

async function fillAndSubmit() {
  fireEvent.changeText(screen.getByTestId('input-name'), 'Ada');
  fireEvent.changeText(screen.getByTestId('input-email'), 'ada@example.com');
  fireEvent.changeText(screen.getByTestId('input-password'), 'password');
  fireEvent.changeText(screen.getByTestId('input-password-confirmation'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-register'));
  });
}

test('registering signs in and lands on the picker', async () => {
  jest.mocked(authApi.register).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/register' });
  await screen.findByTestId('btn-register');

  await fillAndSubmit();

  expect(authApi.register).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Ada', email: 'ada@example.com', password: 'password', password_confirmation: 'password' }),
  );
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('server validation errors appear on their fields', async () => {
  jest.mocked(authApi.register).mockRejectedValue(new ValidationError('x', { email: ['The email has already been taken.'] }));
  await renderApp(routes, { initialUrl: '/register' });
  await screen.findByTestId('btn-register');

  await fillAndSubmit();

  expect(await screen.findByText('The email has already been taken.')).toBeOnTheScreen();
});
