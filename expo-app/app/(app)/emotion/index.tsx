import { useEmotionHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function EmotionHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="emotion"
      home={useEmotionHome()}
      title={t('Name the Emotion')}
      createLabel={t('New Name the Emotion game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Name the Emotion games')}
      testIDs={{ create: 'btn-open-create-emotion', join: 'btn-open-join-emotion', game: (code) => `game-${code}` }}
    />
  );
}
