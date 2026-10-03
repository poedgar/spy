import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { configureClient } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import type { RegisterInput, TokenResult, User } from '@/api/types';
import { clearSession, readSession, writeSession } from './session';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; token: string; user: User };

interface AuthContextValue {
  state: AuthState;
  login(email: string, password: string): Promise<{ challenge: string } | null>;
  completeTwoFactor(challenge: string, answer: { code?: string; recovery_code?: string }): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  signOutLocally(): Promise<void>;
  setUser(user: User): void;
  pendingHref: string | null;
  setPendingHref(href: string | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const deviceName = () => Device.deviceName ?? `${Platform.OS} device`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const signOutLocally = useCallback(async () => {
    tokenRef.current = null;
    await clearSession();
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  const signIn = useCallback(async ({ token, user }: TokenResult) => {
    tokenRef.current = token;
    await writeSession({ token, user });
    setState({ status: 'signedIn', token, user });
  }, []);

  useEffect(() => {
    configureClient({ getToken: () => tokenRef.current, onUnauthorized: () => void signOutLocally() });
  }, [signOutLocally]);

  // Restore the stored session immediately (works offline), then refresh the
  // user in the background; only a 401 ends the session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await readSession();
      if (cancelled) return;
      if (!session) {
        setState({ status: 'signedOut' });
        return;
      }
      tokenRef.current = session.token;
      setState({ status: 'signedIn', token: session.token, user: session.user });
      try {
        const user = await meApi.get();
        if (!cancelled && tokenRef.current === session.token) {
          await writeSession({ token: session.token, user });
          setState({ status: 'signedIn', token: session.token, user });
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) return; // offline or transient
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      pendingHref,
      setPendingHref,
      signOutLocally,
      async login(email, password) {
        const result = await authApi.login({ email, password, device_name: deviceName() });
        if ('two_factor' in result) return { challenge: result.challenge };
        await signIn(result);
        return null;
      },
      async completeTwoFactor(challenge, answer) {
        await signIn(await authApi.twoFactor({ challenge, ...answer }));
      },
      async register(input) {
        await signIn(await authApi.register({ ...input, device_name: deviceName() }));
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          // The local sign-out below is what matters to the user.
        }
        await signOutLocally();
      },
      setUser(user) {
        if (state.status !== 'signedIn') return;
        void writeSession({ token: state.token, user });
        setState({ ...state, user });
      },
    }),
    [state, pendingHref, signIn, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useSignedInUser(): User {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useSignedInUser requires a signed-in user');
  return state.user;
}
