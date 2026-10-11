import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { meApi } from '@/api/endpoints';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * Shown until the account's email is confirmed: playing needs it. The link
 * works on any device; coming back to the app checks again on its own.
 */
export default function VerifyEmail() {
  const { t } = useI18n();
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const user = useSignedInUser();
  const { showBanner } = useBanner();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  const check = useCallback(
    async (announce: boolean) => {
      setChecking(true);
      try {
        const fresh = await meApi.get();
        setUser(fresh);
        if (fresh.must_verify_email) {
          if (announce) showBanner({ tone: 'error', message: t('Not verified yet. Open the link in the email first.') });
        } else {
          router.replace('/');
        }
      } catch {
        if (announce) showBanner({ tone: 'error', message: t('Something went wrong.') });
      } finally {
        setChecking(false);
      }
    },
    [router, setUser, showBanner, t],
  );

  // Back from the mail app: check without being asked.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void check(false);
    });
    return () => subscription.remove();
  }, [check]);

  const resend = async () => {
    setSending(true);
    try {
      await meApi.resendVerification();
      showBanner({ message: t('Verification link sent.') });
    } catch {
      showBanner({ tone: 'error', message: t('Something went wrong.') });
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen testID="verify-email">
      <Stack.Screen options={{ title: t('Email verification'), headerBackVisible: false }} />
      <Card>
        <AppText variant="heading">{t('Check your email')}</AppText>
        <AppText>{t('We sent the link to :email.', { email: user.email ?? '' })}</AppText>
        <AppText variant="muted">{t('Open it on any device, then come back here.')}</AppText>
      </Card>
      <Button testID="btn-verified" label={t("I've verified")} loading={checking} onPress={() => void check(true)} />
      <Button
        testID="btn-resend-verification"
        label={t('Send the link again')}
        variant="secondary"
        loading={sending}
        onPress={() => void resend()}
      />
      <Button
        testID="btn-change-email"
        label={t('Wrong address? Change it')}
        variant="secondary"
        onPress={() => router.push('/settings/profile')}
      />
      <Button testID="btn-logout" label={t('Log out')} variant="secondary" onPress={() => void logout()} />
    </Screen>
  );
}
