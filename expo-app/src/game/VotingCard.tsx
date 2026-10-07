import { Pressable, View } from 'react-native';
import type { Game, Round } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

interface Props {
  game: Game;
  round: Round;
  meId: number;
  isHost: boolean;
  busy: boolean;
  onVote(suspectId: number): void;
  onClose(): void;
}

export function VotingCard({ game, round, meId, isHost, busy, onVote, onClose }: Props) {
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const suspects = (game.players ?? []).filter((player) => player.user.id !== meId);

  return (
    <Card testID="voting-card">
      <AppText variant="heading">{t('Who is the spy?')}</AppText>
      <AppText variant="muted" testID="votes-cast">
        {t(':voted of :total votes cast', { voted: round.voted_user_ids.length, total: game.players?.length ?? 0 })}
      </AppText>
      <AppText variant="muted">
        {t(
          'Vote for the operative you suspect. You can change your vote until voting closes; it closes on its own once everyone has voted.',
        )}
      </AppText>
      <View style={{ gap: spacing.sm }}>
        {suspects.map((player) => {
          const chosen = round.my_vote === player.user.id;
          return (
            <Pressable
              key={player.id}
              testID={`suspect-${player.user.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, disabled: busy }}
              disabled={busy}
              onPress={() => onVote(player.user.id)}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: chosen ? 2 : 1,
                borderColor: chosen ? colors.primary : colors.border,
              }}
            >
              <AppText>
                {player.user.codename} <AppText variant="muted">({player.user.name})</AppText>
                {chosen ? ' ✓' : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {isHost ? (
        <Button testID="btn-close-voting" label={t('Close voting and reveal')} variant="secondary" loading={busy} onPress={onClose} />
      ) : null}
    </Card>
  );
}
