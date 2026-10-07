import type { Game, Round, RoundResult } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';
import { operativeName } from './labels';

export function ResultsCard({ game, round, result }: { game: Game; round: Round; result: RoundResult }) {
  const { t, place } = useI18n();
  const { colors } = useTheme();
  const name = (userId: number | null) => operativeName(game.players, userId, t('a departed operative'));
  const spiesWon = result.winning_team === 'spies';

  let summary: string;
  if (result.ending === 'spy_guess') {
    summary = spiesWon
      ? t(':spy named the location. The spies win!', { spy: name(result.guessed_by_user_id) })
      : t(':spy guessed :place and was wrong. The loyalists win!', {
          spy: name(result.guessed_by_user_id),
          place: place(result.guessed_location),
        });
  } else if (result.accused_user_id === null) {
    summary = t('The table could not agree on a suspect. The spies win!');
  } else {
    summary = spiesWon
      ? t(':player was innocent. The spies win!', { player: name(result.accused_user_id) })
      : t(':player was a spy. The loyalists win!', { player: name(result.accused_user_id) });
  }

  return (
    <Card testID="round-results" style={{ borderWidth: 2, borderColor: spiesWon ? colors.destructive : colors.online }}>
      <AppText variant="heading">
        {spiesWon
          ? t('Spies win round :number', { number: round.number })
          : t('Loyalists win round :number', { number: round.number })}
      </AppText>
      <AppText testID="round-summary">{summary}</AppText>
      <AppText>
        <AppText variant="muted">{t('Location')}: </AppText>
        {place(round.location)}
      </AppText>
      <AppText>
        <AppText variant="muted">{result.spy_user_ids.length === 1 ? t('Spy') : t('Spies')}: </AppText>
        <AppText style={{ color: colors.destructive }}>{result.spy_user_ids.map((id) => name(id)).join(', ')}</AppText>
      </AppText>
      {result.votes.length > 0 ? (
        <>
          <AppText variant="heading">{t('Votes')}</AppText>
          {result.votes.map((vote) => (
            <AppText key={vote.voter_id} variant="muted">
              {name(vote.voter_id)} → {name(vote.suspect_id)}
            </AppText>
          ))}
        </>
      ) : null}
    </Card>
  );
}
