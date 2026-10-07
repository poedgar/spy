import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { LanguagePicker } from '@/components/LanguagePicker';

export default function Welcome() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ gap: 8, marginTop: 96 }}>
        <AppText variant="title">{t('SpyNet')}</AppText>
        <AppText variant="muted">{t('Social-deduction party games. Find the mole before time runs out.')}</AppText>
      </View>
      <Button testID="btn-welcome-login" label={t('Log in')} onPress={() => router.push('/login')} />
      <Button testID="btn-welcome-register" label={t('Create an account')} variant="secondary" onPress={() => router.push('/register')} />
      <LanguagePicker />
    </Screen>
  );
}
