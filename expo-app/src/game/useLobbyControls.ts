import { Share } from 'react-native';
import { useLobbyAction } from '@/api/queries';
import type { Game } from '@/api/types';
import { useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { useDialog } from '@/dialog/DialogProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { operativeName } from './labels';

const DEFAULT_MIN_PLAYERS = 3;

/** What both lobbies share: the viewer's place in the game and running lobby actions. */
export function useLobbyControls(game: Game) {
  const me = useSignedInUser();
  const { t } = useI18n();
  const showDialog = useDialog();
  const { showBanner } = useBanner();
  const action = useLobbyAction(game.code);

  const players = game.players ?? [];
  const minPlayers = game.min_players ?? DEFAULT_MIN_PLAYERS;

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') });

  const confirm = (title: string, onConfirm: () => void) =>
    showDialog({
      title,
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Confirm'), style: 'destructive', onPress: onConfirm },
      ],
    });

  const share = () => {
    const params = { title: game.title, code: game.code, link: `marvelousgames://join/${game.code}` };
    return Share.share({
      message:
        game.game_type === 'phrase'
          ? t('Join my Phrase game ":title" with invite code :code: :link', params)
          : t('Join my Spy game ":title" with invite code :code: :link', params),
    });
  };

  return {
    me,
    t,
    isHost: game.host_id === me.id,
    mine: players.find((player) => player.user.id === me.id),
    minPlayers,
    canStart: game.player_count >= minPlayers,
    busy: action.isPending,
    pending: action.variables,
    run: (next: Parameters<typeof action.mutate>[0]) => action.mutate(next, { onError }),
    onError,
    confirm,
    share,
    name: (userId: number | null) => operativeName(players, userId, t('a departed player')),
  };
}
