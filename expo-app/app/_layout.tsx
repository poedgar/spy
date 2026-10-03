import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { bindQueryClientToAppState, createQueryClient } from '@/api/queryClient';
import { AuthProvider } from '@/auth/AuthProvider';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => bindQueryClientToAppState(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}
