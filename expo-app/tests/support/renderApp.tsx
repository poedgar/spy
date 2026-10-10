import { QueryClientProvider } from '@tanstack/react-query';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import type { ComponentType, ReactNode } from 'react';
import { gamesApi, meApi, notificationsApi } from '@/api/endpoints';
import { createQueryClient } from '@/api/queryClient';
import type { User } from '@/api/types';
import { AuthProvider } from '@/auth/AuthProvider';
import { SESSION_KEY } from '@/auth/session';
import { BannerProvider } from '@/banner/BannerProvider';
import { DialogProvider } from '@/dialog/DialogProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';

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

  // The notification bell is on most screens; give mocked APIs an empty feed.
  if (jest.isMockFunction(notificationsApi.list) && !jest.mocked(notificationsApi.list).getMockImplementation()) {
    jest.mocked(notificationsApi.list).mockResolvedValue({ unread_count: 0, notifications: [] });
  }
  // Lobbies show chat and who's in voice; default to empty.
  if (jest.isMockFunction(gamesApi.messages) && !jest.mocked(gamesApi.messages).getMockImplementation()) {
    jest.mocked(gamesApi.messages).mockResolvedValue([]);
  }
  if (jest.isMockFunction(gamesApi.voiceParticipants) && !jest.mocked(gamesApi.voiceParticipants).getMockImplementation()) {
    jest.mocked(gamesApi.voiceParticipants).mockResolvedValue([]);
  }

  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider>
            <BannerProvider>
              <DialogProvider>
                <RealtimeProvider>{children}</RealtimeProvider>
              </DialogProvider>
            </BannerProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  const result = renderRouter(routes, { initialUrl: options.initialUrl, wrapper: Providers });
  return { ...result, queryClient };
}
