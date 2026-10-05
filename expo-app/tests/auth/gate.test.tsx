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

function JoinScreenStub() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <Text>{`join screen: ${code ?? 'empty'}`}</Text>;
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
  expect(screen).toHaveSearchParams({ code: 'SPY-AB3D' });
});

test('an invalid join link falls back to the empty join screen', async () => {
  await renderApp(routes, { initialUrl: '/join/not-a-code', user: fakeUser });

  await waitFor(() => expect(screen).toHavePathname('/spy/join'));
  // The join screen reads its own route params; the parent group's params
  // still carry the original URL's segment, so global search params do not.
  expect(screen.getByText('join screen: empty')).toBeOnTheScreen();
});
