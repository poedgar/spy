import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';

export default function Settings() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useSignedInUser();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Card>
        <AppText variant="heading">{user.codename}</AppText>
        <AppText variant="muted">{user.email}</AppText>
      </Card>
      <Button label="Profile" variant="secondary" onPress={() => router.push('/settings/profile')} />
      <Button label="Password" variant="secondary" onPress={() => router.push('/settings/password')} />
      <Button label="Delete account" variant="secondary" onPress={() => router.push('/settings/delete-account')} />
      <Button
        testID="btn-logout"
        label="Log out"
        loading={loggingOut}
        onPress={() => {
          setLoggingOut(true);
          void logout();
        }}
      />
    </Screen>
  );
}
