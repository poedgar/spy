import { useFinishHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function FinishHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="finish"
      home={useFinishHome()}
      title={t('Finish the Phrase')}
      createLabel={t('New Finish the Phrase game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Finish the Phrase games')}
      testIDs={{ create: 'btn-open-create-finish', join: 'btn-open-join-finish', game: (code) => `game-${code}` }}
    />
  );
}
