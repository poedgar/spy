import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bindQueryClientToAppState, createQueryClient } from '@/api/queryClient';
import { AuthProvider } from '@/auth/AuthProvider';
import { BannerProvider } from '@/banner/BannerProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { NotificationsProvider } from '@/notifications/NotificationsProvider';
import { RealtimeProvider } from '@/realtime/RealtimeProvider';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => bindQueryClientToAppState(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <I18nProvider>
          <BannerProvider>
            <RealtimeProvider>
              <NotificationsProvider>
                <Slot />
              </NotificationsProvider>
            </RealtimeProvider>
          </BannerProvider>
          </I18nProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
