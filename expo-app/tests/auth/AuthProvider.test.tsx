import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { request } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { ApiError, NetworkError } from '@/api/errors';
import { createQueryClient } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { SESSION_KEY } from '@/auth/session';
import { fakeUser } from '../support/fakes';

jest.mock('@/api/endpoints');

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

async function seedSession() {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: 'saved', user: fakeUser }));
}

test('starts signed out with no stored session', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
});

test('restores a stored session and refreshes the user', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue({ ...fakeUser, name: 'Ada Updated' });

  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state).toMatchObject({ status: 'signedIn', user: { name: 'Ada Updated' } }));
});

test('stays signed in from the stored session when offline at launch', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockRejectedValue(new NetworkError());

  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state).toMatchObject({ status: 'signedIn', token: 'saved' }));
});

test('login without 2FA signs in and stores the session', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 'new', user: fakeUser });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.login('ada@example.com', 'password');
  });

  expect(outcome).toBeNull();
  expect(result.current.state).toMatchObject({ status: 'signedIn', token: 'new' });
  expect(JSON.parse((await SecureStore.getItemAsync(SESSION_KEY))!)).toMatchObject({ token: 'new' });
});

test('login for a 2FA user returns the challenge and stays signed out', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ two_factor: true, challenge: 'c'.repeat(40) });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.login('ada@example.com', 'password');
  });

  expect(outcome).toEqual({ challenge: 'c'.repeat(40) });
  expect(result.current.state.status).toBe('signedOut');
});

test('logout calls the API, clears storage and signs out even if the API call fails', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue(fakeUser);
  jest.mocked(authApi.logout).mockRejectedValue(new ApiError(500, 'x'));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

  await act(() => result.current.logout());

  expect(authApi.logout).toHaveBeenCalled();
  expect(result.current.state.status).toBe('signedOut');
  expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
});

test('a 401 from any request signs the user out', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue(fakeUser);
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

  globalThis.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  await act(async () => {
    await request('GET', '/games/spy').catch(() => undefined);
  });

  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
});
