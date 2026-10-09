import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Screen } from '@/components/Screen';
import { useMutation } from '@tanstack/react-query';
import { meApi } from '@/api/endpoints';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { useI18n } from '@/i18n/I18nProvider';

export default function Settings() {
  const { t } = useI18n();
  const router = useRouter();
  const { logout } = useAuth();
  const user = useSignedInUser();
  const [loggingOut, setLoggingOut] = useState(false);
  const { showBanner } = useBanner();
  const resend = useMutation({ mutationFn: meApi.resendVerification });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Settings') }} />
      <Card>
        <AppText variant="heading">{user.codename}</AppText>
        <AppText variant="muted">{user.email}</AppText>
      </Card>
      {user.email_verified === false ? (
        <Card testID="email-unverified">
          <AppText>
            {t(
              'Your email address is not verified yet, so we cannot send you invitation emails. Check your inbox for the link.',
            )}
          </AppText>
          <Button
            testID="btn-resend-verification"
            label={t('Send the link again')}
            variant="secondary"
            loading={resend.isPending}
            onPress={() =>
              resend.mutate(undefined, {
                onSuccess: () => showBanner({ message: t('Verification link sent.') }),
                onError: () => showBanner({ tone: 'error', message: t('Something went wrong.') }),
              })
            }
          />
        </Card>
      ) : null}
      <LanguagePicker />
      <Button label={t('Profile')} variant="secondary" onPress={() => router.push('/settings/profile')} />
      <Button label={t('Password')} variant="secondary" onPress={() => router.push('/settings/password')} />
      <Button label={t('Delete account')} variant="secondary" onPress={() => router.push('/settings/delete-account')} />
      <Button
        testID="btn-logout"
        label={t('Log out')}
        loading={loggingOut}
        onPress={() => {
          setLoggingOut(true);
          void logout();
        }}
      />
    </Screen>
  );
}
