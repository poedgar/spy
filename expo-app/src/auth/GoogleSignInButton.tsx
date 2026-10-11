import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { Button } from '@/components/Button';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { googleSignInEnabled } from './googleSignIn';

/** "Continue with Google" (through Firebase); hidden until it is configured. */
export function GoogleSignInButton() {
  const { t } = useI18n();
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const { showBanner } = useBanner();
  const [busy, setBusy] = useState(false);

  if (!googleSignInEnabled) return null;

  const onPress = async () => {
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result && result !== 'cancelled') {
        router.push({ pathname: '/two-factor', params: { challenge: result.challenge } });
      }
    } catch (error) {
      showBanner({
        tone: 'error',
        message: applyServerErrors(error, () => {}, []) ?? t('Google sign-in failed. Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      testID="btn-google-sign-in"
      label={t('Continue with Google')}
      variant="secondary"
      loading={busy}
      onPress={() => void onPress()}
    />
  );
}
