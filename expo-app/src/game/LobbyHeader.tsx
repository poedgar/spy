import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLeaveGame } from '@/api/queries';
import type { Game } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { homePathFor } from '@/linking';
import { useTheme } from '@/theme/useTheme';
import { statusLabels } from './labels';
import { useLobbyControls } from './useLobbyControls';

interface Props {
  game: Game;
  /** Roles or words are dealt: nobody may leave or be removed. */
  inRound: boolean;
  /** Game-specific details under the title. */
  meta: ReactNode;
  /** Game-specific buttons (start, vote, reveal, …). */
  children?: ReactNode;
}

/**
 * The top of either lobby: invite code, status and title, then the
 * controls every game has (invite, back to recruiting, close, leave).
 */
export function LobbyHeader({ game, inRound, meta, children }: Props) {
  const router = useRouter();
  const { t, isHost, canStart, minPlayers, busy, run, confirm, share, onError } = useLobbyControls(game);
  const { spacing } = useTheme();
  const leave = useLeaveGame(game.code);
  const close = useLeaveGame(game.code, { close: true });
  // Back to the list underneath rather than stacking a second copy of it.
  const goHome = () => router.dismissTo(homePathFor(game.game_type));

  return (
    <Card>
      <AppText variant="muted">{t('Invite code')}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText testID="lobby-code" variant="mono">
          {game.code}
        </AppText>
        <Button testID="btn-share" label={t('Share')} variant="secondary" onPress={() => void share()} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          {game.title}
        </AppText>
        <Badge label={statusLabels(t)[game.status]} />
      </View>
      {meta}

      {children}

      {isHost && !inRound && !canStart ? (
        <AppText variant="muted">{t('At least :count players are required to start.', { count: minPlayers })}</AppText>
      ) : null}
      {!isHost && game.status === 'recruiting' ? (
        <AppText variant="muted">{t('Waiting for the host to start the game…')}</AppText>
      ) : null}

      {isHost && game.status === 'recruiting' ? (
        <Button
          testID="btn-invite-players"
          label={t('Invite Players')}
          variant="secondary"
          onPress={() => router.push(`/games/${game.code}/invite`)}
        />
      ) : null}
      {isHost && game.status !== 'recruiting' ? (
        <Button
          testID="btn-reset-game"
          label={t('Back to recruiting')}
          variant="secondary"
          disabled={busy}
          onPress={() =>
            inRound
              ? confirm(t('End this round without scoring and reopen recruiting?'), () => run({ type: 'reset' }))
              : run({ type: 'reset' })
          }
        />
      ) : null}
      {!inRound ? (
        <Button
          testID="btn-leave-game"
          label={t('Leave')}
          variant="secondary"
          loading={leave.isPending}
          onPress={() =>
            confirm(
              isHost
                ? t('Leave? Hosting passes to the next player, or the game closes if nobody is left.')
                : t('Leave this game?'),
              () => leave.mutate(undefined, { onSuccess: goHome, onError }),
            )
          }
        />
      ) : null}
      {isHost ? (
        <Button
          testID="btn-close-game"
          label={t('Close game')}
          variant="destructive"
          loading={close.isPending}
          onPress={() =>
            confirm(t('Close this game for everyone? This cannot be undone.'), () =>
              close.mutate(undefined, { onSuccess: goHome, onError }),
            )
          }
        />
      ) : null}
    </Card>
  );
}
