import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi, meApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import DeleteAccount from '../../app/(app)/settings/delete-account';
import Settings from '../../app/(app)/settings/index';
import Password from '../../app/(app)/settings/password';
import Profile from '../../app/(app)/settings/profile';
import AuthLayout from '../../app/(auth)/_layout';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': () => <Text>welcome</Text>,
  '(app)/_layout': AppLayout,
  '(app)/settings/index': Settings,
  '(app)/settings/profile': Profile,
  '(app)/settings/password': Password,
  '(app)/settings/delete-account': DeleteAccount,
};

test('log out returns to welcome', async () => {
  jest.mocked(authApi.logout).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/settings', user: fakeUser });

  const button = await screen.findByTestId('btn-logout');
  await act(async () => {
    fireEvent.press(button);
  });

  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('profile edits are saved and shown', async () => {
  jest.mocked(meApi.update).mockResolvedValue({ ...fakeUser, name: 'Ada L.' });
  await renderApp(routes, { initialUrl: '/settings/profile', user: fakeUser });

  expect(await screen.findByDisplayValue('ada@example.com')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('input-profile-name'), 'Ada L.');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-save-profile'));
  });

  expect(meApi.update).toHaveBeenCalledWith({ name: 'Ada L.', email: 'ada@example.com' });
  expect(await screen.findByText('Profile updated.')).toBeOnTheScreen();
});

test('a wrong current password is shown on its field', async () => {
  jest.mocked(meApi.updatePassword).mockRejectedValue(new ValidationError('x', { current_password: ['The password is incorrect.'] }));
  await renderApp(routes, { initialUrl: '/settings/password', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-current-password'), 'wrong');
  fireEvent.changeText(screen.getByTestId('input-new-password'), 'new-password');
  fireEvent.changeText(screen.getByTestId('input-new-password-confirmation'), 'new-password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-save-password'));
  });

  expect(await screen.findByText('The password is incorrect.')).toBeOnTheScreen();
});

test('deleting the account signs out to welcome', async () => {
  jest.mocked(meApi.destroy).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/settings/delete-account', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-delete-password'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-delete-account'));
  });

  expect(meApi.destroy).toHaveBeenCalledWith('password');
  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('a wrong password does not delete the account', async () => {
  jest.mocked(meApi.destroy).mockRejectedValue(new ValidationError('x', { password: ['The password is incorrect.'] }));
  await renderApp(routes, { initialUrl: '/settings/delete-account', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-delete-password'), 'wrong');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-delete-account'));
  });

  expect(await screen.findByText('The password is incorrect.')).toBeOnTheScreen();
  expect(screen).toHavePathname('/settings/delete-account');
});
