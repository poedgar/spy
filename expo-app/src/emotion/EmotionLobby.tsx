import { Image, View } from 'react-native';
import type { Emotion, EmotionRound, Game } from '@/api/types';
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
import { FaceCredit } from './FaceCredit';
import { emotionLabels, emotionLevelLabels } from './labels';

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

/** The lobby of a Name the Emotion game: one face, everyone picks the emotion, then the answer. */
export function EmotionLobby({ game, refreshing, onRefresh }: Props) {
  const { me, t, isHost, canStart, busy, pending, run, confirm, name } = useLobbyControls(game);
  const { spacing, colors, radius } = useTheme();
  const emotions = emotionLabels(t);
  const level = emotionLevelLabels(t)[game.emotion_level ?? 1].label;

  const round: EmotionRound | null = game.emotion ?? null;
  const answering = game.status === 'active';
  const isPlayer = game.players?.some((player) => player.user.id === me.id) ?? false;
  const result = game.status === 'completed' ? (round?.result ?? null) : null;
  const picksFor = (emotion: Emotion) => (result?.answers ?? []).filter((answer) => answer.emotion === emotion);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <LobbyHeader
        game={game}
        inRound={answering}
        meta={
          <AppText variant="muted" testID="lobby-meta">
            {t(':count / :max players', { count: game.player_count, max: game.max_players })} · {t('Name the Emotion')} ·{' '}
            {level}
          </AppText>
        }
      >
        {isHost && !answering ? (
          <Button
            testID="btn-start-emotion"
            label={game.status === 'completed' ? t('Next face') : t('Start the game')}
            loading={busy && pending?.type === 'emotion-start'}
            disabled={!canStart || busy}
            onPress={() => run({ type: 'emotion-start' })}
          />
        ) : null}
        {isHost && answering ? (
          <Button
            testID="btn-reveal-emotion"
            label={t('Show the answer')}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              confirm(t("Show the answer now? Players who haven't picked yet will miss this face."), () =>
                run({ type: 'emotion-reveal' }),
              )
            }
          />
        ) : null}
      </LobbyHeader>

      {isHost && game.status === 'recruiting' ? <HostPanel game={game} busy={busy} run={run} /> : null}

      {game.voice_enabled && isPlayer ? <VoicePanel code={game.code} /> : null}

      {round && game.status !== 'recruiting' ? (
        <Card testID="face-card" style={{ borderWidth: 2, borderColor: colors.primary }}>
          <AppText variant="heading">{t('Face :number', { number: round.number })}</AppText>
          <Image
            testID="face-image"
            source={{ uri: round.image_url }}
            accessibilityLabel={t('A face showing an emotion')}
            resizeMode="cover"
            style={{ width: '100%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.muted }}
          />

          {answering ? (
            <>
              <AppText variant="muted">
                {t('Which emotion is this? :done of :total picked. You can change your pick until the answer is shown.', {
                  done: round.answered_user_ids.length,
                  total: game.player_count,
                })}
              </AppText>
              <View testID="emotion-options" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {round.options.map((option) => (
                  <View key={option} style={{ flexBasis: '47%', flexGrow: 1 }}>
                    <Button
                      testID={`btn-emotion-${option}`}
                      label={`${round.my_answer === option ? '✓ ' : ''}${emotions[option]}`}
                      variant={round.my_answer === option ? 'primary' : 'secondary'}
                      disabled={busy || !isPlayer}
                      onPress={() => run({ type: 'emotion-answer', emotion: option })}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {result ? (
            <View testID="emotion-result" style={{ gap: spacing.xs }}>
              <AppText variant="heading">
                {t('It was :emotion.', { emotion: emotions[result.emotion] })}
              </AppText>
              {round.my_answer ? (
                <AppText
                  testID="my-verdict"
                  style={{ color: round.my_answer === result.emotion ? colors.online : colors.destructive }}
                >
                  {round.my_answer === result.emotion
                    ? t('You got it!')
                    : t('You picked :emotion.', { emotion: emotions[round.my_answer] })}
                </AppText>
              ) : null}
              {round.options.map((option) => (
                <AppText key={option} variant={option === result.emotion ? 'body' : 'muted'}>
                  {option === result.emotion ? '✓ ' : '· '}
                  {emotions[option]}: {picksFor(option).map((pick) => name(pick.user_id)).join(', ') || '—'}
                </AppText>
              ))}
              {result.hit_rate !== null ? (
                <AppText testID="face-hit-rate" variant="muted">
                  {t('Across all games, :percent% of :count answers named this face right.', {
                    percent: Math.round(result.hit_rate * 100),
                    count: result.answers_so_far,
                  })}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}

      {isPlayer ? <ChatPanel code={game.code} gameId={game.id} /> : null}

      <Roster
        game={game}
        inRound={answering}
        badge={(player) =>
          answering && round?.answered_user_ids.includes(player.user.id) ? (
            <Badge label={t('picked')} tone="muted" />
          ) : null
        }
      />

      <RoundHistory game={game} />
      <FaceCredit />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
