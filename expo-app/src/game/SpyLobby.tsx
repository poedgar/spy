import { useRouter } from 'expo-router';
import type { Game } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { VoicePanel } from '@/voice/VoicePanel';
import { HostPanel } from './HostPanel';
import { modeLabels, spyCountFor, tierLabels } from './labels';
import { LobbyHeader } from './LobbyHeader';
import { ResultsCard } from './ResultsCard';
import { RoleCard } from './RoleCard';
import { RoundHistory } from './RoundHistory';
import { Roster } from './Roster';
import { useLobbyControls } from './useLobbyControls';
import { VotingCard } from './VotingCard';

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

export function SpyLobby({ game, refreshing, onRefresh }: Props) {
  const router = useRouter();
  const { me, t, isHost, canStart, busy, pending, run } = useLobbyControls(game);
  const round = game.round ?? null;
  const inRound = game.status === 'active' || game.status === 'voting';
  const spies = game.spy_count ?? spyCountFor(game.player_count);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <LobbyHeader
        game={game}
        inRound={inRound}
        meta={
          <>
            <AppText variant="muted" testID="lobby-meta">
              {t(':count / :max operatives', { count: game.player_count, max: game.max_players })} ·{' '}
              {spies === 1 ? t('1 spy') : t(':count spies', { count: spies })}
              {game.game_mode ? ` · ${modeLabels(t)[game.game_mode]}` : ''}
              {game.age_tier ? ` · ${tierLabels(t)[game.age_tier].label}` : ''}
              {game.round_seconds ? ` · ${t(':minutes min rounds', { minutes: game.round_seconds / 60 })}` : ''}
            </AppText>
            {game.mission_briefing ? <AppText>{game.mission_briefing}</AppText> : null}
          </>
        }
      >
        {isHost && !inRound ? (
          <Button
            testID="btn-start-round"
            label={game.status === 'completed' ? t('Start next round') : t('Start the game')}
            loading={busy && pending?.type === 'start'}
            disabled={!canStart || busy}
            onPress={() => run({ type: 'start' })}
          />
        ) : null}
        {isHost && game.status === 'active' ? (
          <Button
            testID="btn-start-voting"
            label={t('Call a vote')}
            loading={busy && pending?.type === 'voting'}
            onPress={() => run({ type: 'voting' })}
          />
        ) : null}
        <Button
          testID="btn-location-guide"
          label={t('Location guide')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/locations', params: { tier: game.age_tier ?? 'adults' } })}
        />
      </LobbyHeader>

      {isHost && game.status === 'recruiting' ? <HostPanel game={game} busy={busy} run={run} /> : null}

      {game.voice_enabled && game.players?.some((player) => player.user.id === me.id) ? (
        <VoicePanel code={game.code} />
      ) : null}

      {round && inRound ? <RoleCard key={round.number} game={game} round={round} onExpire={onRefresh} /> : null}

      {round && game.status === 'voting' ? (
        <VotingCard
          game={game}
          round={round}
          meId={me.id}
          isHost={isHost}
          busy={busy}
          onVote={(suspectId) => run({ type: 'vote', suspectId })}
          onClose={() => run({ type: 'tally' })}
        />
      ) : null}

      {round?.result && game.status === 'completed' ? <ResultsCard game={game} round={round} result={round.result} /> : null}

      <Roster
        game={game}
        inRound={inRound}
        badge={(player) =>
          game.status === 'voting' && round?.voted_user_ids.includes(player.user.id) ? (
            <Badge label={t('voted')} tone="muted" />
          ) : null
        }
      />

      <RoundHistory game={game} />
    </Screen>
  );
}
