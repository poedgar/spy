import { usePhraseHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function PhraseHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="phrase"
      home={usePhraseHome()}
      title={t('Phrase')}
      createLabel={t('New Phrase game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Phrase games')}
      testIDs={{ create: 'btn-open-create-phrase', join: 'btn-open-join-phrase', game: (code) => `game-${code}` }}
    />
  );
}
