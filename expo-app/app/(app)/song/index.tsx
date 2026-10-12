import { useSongHome } from '@/api/queries';
import { GameHome } from '@/game/GameHome';
import { useI18n } from '@/i18n/I18nProvider';

export default function SongHomeScreen() {
  const { t } = useI18n();

  return (
    <GameHome
      gameType="song"
      home={useSongHome()}
      title={t('Sing It Out')}
      createLabel={t('New Sing It Out game')}
      joinLabel={t('Join')}
      gamesHeading={t('Your Sing It Out games')}
      testIDs={{ create: 'btn-open-create-song', join: 'btn-open-join-song', game: (code) => `game-${code}` }}
    />
  );
}
