import { useMemeHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function MemeHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="meme"
      home={useMemeHome()}
      title={t('Meme It')}
      createLabel={t('New Meme It game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Meme It games')}
      testIDs={{ create: 'btn-open-create-meme', join: 'btn-open-join-meme', game: (code) => `game-${code}` }}
    />
  );
}
