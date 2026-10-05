import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { NetworkError } from './errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Retry twice on network errors only; 4xx answers are final.
      queries: { retry: (count, error) => error instanceof NetworkError && count < 2, staleTime: 10_000 },
      mutations: { retry: false },
    },
  });
}

/** Refetch stale queries when the app returns to the foreground or regains network. */
export function bindQueryClientToAppState(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );

  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });

  return () => subscription.remove();
}
