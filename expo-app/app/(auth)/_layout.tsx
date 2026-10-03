import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

export default function AuthLayout() {
  const { state, pendingHref, setPendingHref } = useAuth();
  const signedIn = state.status === 'signedIn';

  // <Redirect> navigates again on every render, so the target is fixed at the
  // moment of sign-in; clearing pendingHref below must not re-aim it at '/'.
  const [target, setTarget] = useState<string | null>(null);
  if (signedIn && target === null) setTarget(pendingHref ?? '/');
  if (!signedIn && target !== null) setTarget(null);

  useEffect(() => {
    if (signedIn && pendingHref) setPendingHref(null);
  }, [signedIn, pendingHref, setPendingHref]);

  if (signedIn) return <Redirect href={target ?? pendingHref ?? '/'} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
