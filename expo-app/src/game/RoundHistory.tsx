import { useState } from 'react';
import { Pressable } from 'react-native';
import type { Game, HistoryEntry } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { operativeName } from './labels';

/** Earlier rounds of this game, collapsed until tapped. */
export function RoundHistory({ game }: { game: Game }) {
  const { t, place } = useI18n();
  const [open, setOpen] = useState(false);
  const history = game.history ?? [];
  if (history.length === 0) return null;

  const name = (id: number | null | undefined) => operativeName(game.players, id ?? null, t('a departed player'));

  const outcome = (entry: HistoryEntry) => {
    if (entry.ending === 'abandoned') return t('Abandoned');
    if (game.game_type === 'phrase') {
      return entry.ending === 'guessed' ? t(':player guessed it', { player: name(entry.winner_user_id) }) : t('Nobody guessed it');
    }
    return entry.winning_team === 'spies' ? t('Spies won') : t('Loyalists won');
  };

  return (
    <Card testID="round-history">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}>
        <AppText variant="heading">
          {open ? '▾' : '▸'} {t('Previous rounds')} ({history.length})
        </AppText>
      </Pressable>
      {open
        ? history.map((entry) => (
            <AppText key={entry.number} testID={`history-${entry.number}`}>
              {t('Round :number', { number: entry.number })} ·{' '}
              {game.game_type === 'phrase' ? `“${entry.phrase}”` : place(entry.location)} · {outcome(entry)}
              {game.game_type === 'spy' && entry.spy_user_ids?.length
                ? ` · ${t('Spies')}: ${entry.spy_user_ids.map((id) => name(id)).join(', ')}`
                : ''}
            </AppText>
          ))
        : null}
    </Card>
  );
}
