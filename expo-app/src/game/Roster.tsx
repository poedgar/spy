import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { Game, Player } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OnlineDot } from '@/components/OnlineDot';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';
import { openPlayerMenu } from './playerMenu';
import { useLobbyControls } from './useLobbyControls';

/**
 * Players by score with readiness. Between rounds the host taps a player
 * to make them host or remove them. `badge` adds game-specific markers.
 */
export function Roster({ game, inRound, badge }: { game: Game; inRound: boolean; badge?: (player: Player) => ReactNode }) {
  const { me, t, isHost, mine, busy, run } = useLobbyControls(game);
  const { spacing } = useTheme();
  const online = useOnlineUserIds();

  return (
    <Card>
      <AppText variant="heading">{t('Players')}</AppText>
      {[...(game.players ?? [])]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .map((player) => (
          <Pressable
            key={player.id}
            testID={`roster-${player.user.id}`}
            disabled={!isHost || inRound || player.user.id === me.id}
            accessibilityHint={isHost ? t('Make host') : undefined}
            onPress={() => openPlayerMenu(t, player.user, (next) => run(next))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <OnlineDot online={online.has(player.user.id)} />
            <View style={{ flex: 1 }}>
              <AppText>
                {player.user.codename}
                {player.user.id === me.id ? ` (${t('you')})` : ''}
              </AppText>
              <AppText variant="muted">
                {player.user.name} · {player.status === 'ready' ? t('Ready') : t('Not ready')}
              </AppText>
            </View>
            {player.is_host ? <Badge label={t('Host')} /> : null}
            {badge?.(player)}
            <AppText variant="muted" testID={`score-${player.user.id}`}>
              {t(':score pts', { score: player.score ?? 0 })}
            </AppText>
          </Pressable>
        ))}
      {mine && !inRound ? (
        <Button
          testID="btn-toggle-ready"
          label={mine.status === 'ready' ? t('Mark me not ready') : t('Mark me ready')}
          variant="secondary"
          disabled={busy}
          onPress={() => run({ type: 'ready' })}
        />
      ) : null}
    </Card>
  );
}
