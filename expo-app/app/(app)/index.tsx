import { Link, Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useI18n } from '@/i18n/I18nProvider';

export default function GamePicker() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Screen title={t('Choose a Game')}>
      <Stack.Screen
        options={{
          title: t('Games'),
          headerRight: () => (
            <Link href="/settings" testID="btn-settings">
              <AppText>{t('Settings')}</AppText>
            </Link>
          ),
        }}
      />
      <Pressable testID="tile-spy" accessibilityRole="button" onPress={() => router.push('/spy')}>
        <Card>
          <AppText variant="heading">{t('Spy')}</AppText>
          <AppText variant="muted">{t('A social-deduction party game. Find the mole before time runs out.')}</AppText>
        </Card>
      </Pressable>
      {[0, 1].map((i) => (
        <Card key={i} testID={`tile-coming-soon-${i}`} style={{ opacity: 0.5, borderStyle: 'dashed' }}>
          <AppText variant="heading">{t('Coming Soon')}</AppText>
        </Card>
      ))}
    </Screen>
  );
}
