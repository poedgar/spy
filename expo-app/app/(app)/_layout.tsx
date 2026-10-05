import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';

export default function AppLayout() {
  const { state, pendingHref, setPendingHref } = useAuth();
  const pathname = usePathname();
  const signedOut = state.status === 'signedOut';

  // Remember a join link opened while signed out so the auth layout can send
  // the user there after they log in. Only join links: logging out from
  // Settings must not send the next login back to Settings.
  useEffect(() => {
    if (signedOut && pathname.startsWith('/join/')) setPendingHref(pathname);
  }, [signedOut, pathname, setPendingHref]);

  // The auth layout has redirected to the remembered link; it is consumed now.
  useEffect(() => {
    if (state.status === 'signedIn' && pendingHref) setPendingHref(null);
  }, [state.status, pendingHref, setPendingHref]);

  if (state.status === 'loading') return null;
  if (signedOut) return <Redirect href="/welcome" />;

  return <Stack />;
}
