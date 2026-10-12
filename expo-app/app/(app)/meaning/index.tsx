import { useMeaningHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function MeaningHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="meaning"
      home={useMeaningHome()}
      title={t('Interpret the Phrase')}
      createLabel={t('New Interpret the Phrase game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Interpret the Phrase games')}
      testIDs={{ create: 'btn-open-create-meaning', join: 'btn-open-join-meaning', game: (code) => `game-${code}` }}
    />
  );
}
