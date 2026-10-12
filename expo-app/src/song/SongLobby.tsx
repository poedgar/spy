import { View } from 'react-native';
import type { Game, SongRound } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ChatPanel } from '@/chat/ChatPanel';
import { HostPanel } from '@/game/HostPanel';
import { LobbyHeader } from '@/game/LobbyHeader';
import { RoundHistory } from '@/game/RoundHistory';
import { Roster } from '@/game/Roster';
import { useLobbyControls } from '@/game/useLobbyControls';
import { useTheme } from '@/theme/useTheme';
import { VoicePanel } from '@/voice/VoicePanel';
import { ClipPlayer } from './ClipPlayer';

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

/** The lobby of a Sing It Out game: one clip, everyone sings in turn, then a vote. */
export function SongLobby({ game, refreshing, onRefresh }: Props) {
  const { me, t, isHost, canStart, busy, pending, run, confirm, name } = useLobbyControls(game);
  const { spacing, colors } = useTheme();

  const song: SongRound | null = game.song ?? null;
  const singing = game.status === 'active';
  const voting = game.status === 'voting';
  const inRound = singing || voting;
  const isSinger = song?.singer_user_id === me.id;
  const isPlayer = game.players?.some((player) => player.user.id === me.id) ?? false;
  const result = game.status === 'completed' ? (song?.result ?? null) : null;
  const votesFor = (userId: number) => result?.votes.find((entry) => entry.user_id === userId)?.votes ?? 0;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <LobbyHeader
        game={game}
        inRound={inRound}
        meta={
          <AppText variant="muted" testID="lobby-meta">
            {t(':count / :max players', { count: game.player_count, max: game.max_players })} · {t('Sing It Out')}
          </AppText>
        }
      >
        {isHost && !inRound ? (
          <Button
            testID="btn-start-song"
            label={game.status === 'completed' ? t('Next song') : t('Start the game')}
            loading={busy && pending?.type === 'song-start'}
            disabled={!canStart || busy}
            onPress={() => run({ type: 'song-start' })}
          />
        ) : null}
        {isHost && voting ? (
          <Button
            testID="btn-close-voting"
            label={t('Close the vote')}
            variant="secondary"
            disabled={busy}
            onPress={() => confirm(t('Close the vote now and count it?'), () => run({ type: 'song-close' }))}
          />
        ) : null}
      </LobbyHeader>

      {isHost && game.status === 'recruiting' ? <HostPanel game={game} busy={busy} run={run} /> : null}

      {game.voice_enabled && isPlayer ? <VoicePanel code={game.code} /> : null}

      {inRound && song ? (
        <Card testID="clip-card" style={{ borderWidth: 2, borderColor: colors.primary }}>
          <AppText variant="heading">{t('Song :number', { number: song.number })}</AppText>
          <AppText variant="muted">{t('Listen to the clip, then sing how it goes on.')}</AppText>
          {song.clip_url ? <ClipPlayer key={song.clip_url} url={song.clip_url} /> : null}
        </Card>
      ) : null}

      {singing && song ? (
        <Card testID="singing-card">
          <AppText variant="heading">
            {t(':done of :total sang', { done: song.sung_count, total: song.turn_order.length })}
          </AppText>
          <AppText testID="current-singer">
            {isSinger
              ? t('Your turn: sing how the clip goes on!')
              : t(':player is singing.', { player: name(song.singer_user_id) })}
          </AppText>
          {isSinger || isHost ? (
            <Button
              testID="btn-done-singing"
              label={isSinger ? t('Done singing') : t('Skip to the next singer')}
              variant="secondary"
              loading={busy && pending?.type === 'song-turn'}
              onPress={() => run({ type: 'song-turn' })}
            />
          ) : null}
        </Card>
      ) : null}

      {voting && song ? (
        <Card testID="voting-card">
          <AppText variant="heading">{t('Who sang it best?')}</AppText>
          <AppText variant="muted">
            {t(':voted of :total voted. Votes are secret; you can change yours until the vote closes.', {
              voted: song.voted_user_ids.length,
              total: game.player_count,
            })}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {song.turn_order
              .filter((id) => id !== me.id)
              .map((id) => (
                <Button
                  key={id}
                  testID={`btn-vote-${id}`}
                  label={`${song.my_vote === id ? '✓ ' : ''}${name(id)}`}
                  variant={song.my_vote === id ? 'primary' : 'secondary'}
                  disabled={busy}
                  onPress={() => run({ type: 'song-vote', singerId: id })}
                />
              ))}
          </View>
        </Card>
      ) : null}

      {result ? (
        <Card
          testID="song-results"
          style={{ borderWidth: 2, borderColor: result.winner_user_ids.length ? colors.online : colors.border }}
        >
          <AppText variant="heading">
            {result.winner_user_ids.length
              ? t(':names sang it best!', { names: result.winner_user_ids.map((id) => name(id)).join(', ') })
              : t('Nobody got a vote this time.')}
          </AppText>
          {result.title ? (
            <AppText testID="song-title" variant="title">
              “{result.title}”{result.artist ? ` — ${result.artist}` : ''}
            </AppText>
          ) : null}
          {song?.turn_order.map((id) => (
            <AppText key={id} variant={result.winner_user_ids.includes(id) ? 'body' : 'muted'}>
              {name(id)} — {t(':count votes', { count: votesFor(id) })}
            </AppText>
          ))}
        </Card>
      ) : null}

      {isPlayer ? <ChatPanel code={game.code} gameId={game.id} /> : null}

      <Roster
        game={game}
        inRound={inRound}
        badge={(player) =>
          singing && song?.singer_user_id === player.user.id ? (
            <Badge label={t('singing')} tone="muted" />
          ) : voting && song?.voted_user_ids.includes(player.user.id) ? (
            <Badge label={t('voted')} tone="muted" />
          ) : null
        }
      />

      <RoundHistory game={game} />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
