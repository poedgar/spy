import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import AppLayout from '../../app/(app)/_layout';
import JoinLink from '../../app/(app)/join/[code]';
import AuthLayout from '../../app/(auth)/_layout';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

function FakeLogin() {
  const { login } = useAuth();
  return (
    <Pressable testID="do-login" onPress={() => void login('a@b.c', 'pw')}>
      <Text>welcome</Text>
    </Pressable>
  );
}

// Shows the params the join screen itself receives. expo-router's global URL
// keeps the previous route's `code` after a redirect inside a Stack, so the
// screen's own params are what matter.
function JoinScreenStub() {
  return <Text testID="join-params">{JSON.stringify(useLocalSearchParams())}</Text>;
}

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': FakeLogin,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
  '(app)/join/[code]': JoinLink,
  '(app)/spy/join': JoinScreenStub,
};

test('signed-out users are sent to welcome', async () => {
  await renderApp(routes, { initialUrl: '/' });

  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('signed-in users skip the auth screens', async () => {
  await renderApp(routes, { initialUrl: '/welcome', user: fakeUser });

  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('a join link opened while signed out resumes after login', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/join/SPY-AB3D' });
  await waitFor(() => expect(screen).toHavePathname('/welcome'));

  await act(async () => {
    fireEvent.press(screen.getByTestId('do-login'));
  });

  await waitFor(() => expect(screen).toHavePathname('/spy/join'));
  expect(screen.getByTestId('join-params')).toHaveTextContent('{"code":"SPY-AB3D"}');
});

test('an invalid join link falls back to the empty join screen', async () => {
  await renderApp(routes, { initialUrl: '/join/not-a-code', user: fakeUser });

  await waitFor(() => expect(screen).toHavePathname('/spy/join'));
  expect(screen.getByTestId('join-params')).toHaveTextContent('{}');
});
