import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';

export default function AuthLayout() {
  const { state, pendingHref } = useAuth();

  // pendingHref is cleared by the (app) layout once it mounts. Clearing it here
  // would re-render this layout, and Redirect replaces again on every render.
  if (state.status === 'signedIn') return <Redirect href={pendingHref ?? '/'} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
