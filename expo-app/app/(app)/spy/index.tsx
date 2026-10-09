import { useRouter } from 'expo-router';
import { useSpyHome } from '@/api/queries';
import { Button } from '@/components/Button';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function SpyHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <GameHome
      gameType="spy"
      home={useSpyHome()}
      title={t('Spy')}
      createLabel={t('Create Operation')}
      joinLabel={t('Join Operation')}
      gamesHeading={t('Your Operations')}
      testIDs={{ create: 'btn-open-create', join: 'btn-open-join', game: (code) => `operation-${code}` }}
      extras={
        <Button
          testID="btn-open-locations"
          label={t('Location guide')}
          variant="secondary"
          onPress={() => router.push('/locations')}
        />
      }
    />
  );
}
