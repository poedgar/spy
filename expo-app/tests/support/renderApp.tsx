import { QueryClientProvider } from '@tanstack/react-query';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import type { ComponentType, ReactNode } from 'react';
import { meApi } from '@/api/endpoints';
import { createQueryClient } from '@/api/queryClient';
import type { User } from '@/api/types';
import { AuthProvider } from '@/auth/AuthProvider';
import { SESSION_KEY } from '@/auth/session';
import { BannerProvider } from '@/banner/BannerProvider';

type Routes = Record<string, ComponentType>;

/**
 * Renders the given route files inside the real providers. With `user`, a
 * stored session is seeded first so the app starts signed in. Screens that
 * need the banner/realtime providers get them from their tasks' versions of
 * this wrapper (Tasks 4 and 7 extend `Providers`).
 */
export async function renderApp(routes: Routes, options: { initialUrl: string; user?: User }) {
  if (options.user) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: 'test-token', user: options.user }));
    jest.mocked(meApi.get).mockResolvedValue(options.user);
  }

  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BannerProvider>{children}</BannerProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  const result = renderRouter(routes, { initialUrl: options.initialUrl, wrapper: Providers });
  return { ...result, queryClient };
}
