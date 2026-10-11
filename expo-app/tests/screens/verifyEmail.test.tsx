import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { meApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import VerifyEmail from '../../app/(app)/verify-email';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>choose a game</Text>,
  '(app)/verify-email': VerifyEmail,
  '(app)/settings/profile': () => <Text>profile</Text>,
};
const unverified = { ...fakeUser, email_verified: false, must_verify_email: true };

test('an unverified player is asked to check their email instead of playing', async () => {
  await renderApp(routes, { initialUrl: '/', user: unverified });

  expect(await screen.findByTestId('verify-email')).toBeOnTheScreen();
  expect(screen.getByText('We sent the link to ada@example.com.')).toBeOnTheScreen();
  expect(screen).toHavePathname('/verify-email');
});

test('"I\'ve verified" checks with the server and lets them in once it is true', async () => {
  await renderApp(routes, { initialUrl: '/', user: unverified });
  await screen.findByTestId('verify-email');

  jest.mocked(meApi.get).mockResolvedValueOnce(unverified);
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-verified'));
  });
  expect(await screen.findByText('Not verified yet. Open the link in the email first.')).toBeOnTheScreen();

  jest.mocked(meApi.get).mockResolvedValueOnce({ ...fakeUser, email_verified: true, must_verify_email: false });
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-verified'));
  });
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByText('choose a game')).toBeOnTheScreen();
});

test('they can resend the link or fix a mistyped address', async () => {
  jest.mocked(meApi.resendVerification).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/', user: unverified });
  await screen.findByTestId('verify-email');

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-resend-verification'));
  });
  expect(meApi.resendVerification).toHaveBeenCalled();
  expect(await screen.findByText('Verification link sent.')).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('btn-change-email'));
  expect(await screen.findByText('profile')).toBeOnTheScreen();
});

test('verified players never see it', async () => {
  await renderApp(routes, { initialUrl: '/', user: { ...fakeUser, must_verify_email: false } });

  expect(await screen.findByText('choose a game')).toBeOnTheScreen();
});
