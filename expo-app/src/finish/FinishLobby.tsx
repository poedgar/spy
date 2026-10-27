import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import type { FinishRound, Game } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ChatPanel } from '@/chat/ChatPanel';
import { HostPanel } from '@/game/HostPanel';
import { LobbyHeader } from '@/game/LobbyHeader';
import { RoundHistory } from '@/game/RoundHistory';
import { Roster } from '@/game/Roster';
import { useLobbyControls } from '@/game/useLobbyControls';
import { useTheme } from '@/theme/useTheme';
import { VoicePanel } from '@/voice/VoicePanel';
import { MemeImage } from './MemeImage';

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

/**
 * The lobby of a written game: one phrase, everyone writes an answer (an
 * ending in Finish the Phrase, an interpretation in Interpret the Phrase),
 * then a vote on the answers without names.
 */
export function FinishLobby({ game, refreshing, onRefresh }: Props) {
  const { me, t, isHost, canStart, busy, pending, run, confirm, name } = useLobbyControls(game);
  const { spacing, colors, radius } = useTheme();

  const finish: FinishRound | null = game.finish ?? null;
  const writing = game.status === 'active';
  const voting = game.status === 'voting';
  const inRound = writing || voting;
  const isPlayer = game.players?.some((player) => player.user.id === me.id) ?? false;
  const result = game.status === 'completed' ? (finish?.result ?? null) : null;
  const answered = finish?.answered_user_ids.length ?? 0;

  // The box starts with what I sent; a draft belongs to its round.
  const [draft, setDraft] = useState<{ round: number; text: string } | null>(null);
  const ending = draft && draft.round === finish?.number ? draft.text : (finish?.my_answer ?? '');
  const setEnding = (text: string) => finish && setDraft({ round: finish.number, text });

  const interpreting = game.game_type === 'meaning';
  // Meme It captions a picture; everything else is the same game.
  const memeing = game.game_type === 'meme';
  const meme = memeing && finish?.image_url ? finish : null;
  const copy = memeing
    ? {
        game: t('Meme It'),
        write: t('Write your caption'),
        progress: t(':done of :total wrote. Nobody sees the captions until the vote, and then without names.', {
          done: answered,
          total: game.player_count,
        }),
        placeholder: t('Your caption…'),
        send: t('Send my caption'),
        update: t('Update my caption'),
        which: t('Which meme is the best?'),
        winners: (names: string) => t(':names made the best meme!', { names }),
      }
    : interpreting
    ? {
        game: t('Interpret the Phrase'),
        write: t('Write your interpretation'),
        progress: t(':done of :total wrote. Nobody sees the interpretations until the vote, and then without names.', {
          done: answered,
          total: game.player_count,
        }),
        placeholder: t('It means…'),
        send: t('Send my interpretation'),
        update: t('Update my interpretation'),
        which: t('Which interpretation is the best?'),
        winners: (names: string) => t(':names gave the best interpretation!', { names }),
      }
    : {
        game: t('Finish the Phrase'),
        write: t('Write your ending'),
        progress: t(':done of :total wrote. Nobody sees the endings until the vote, and then without names.', {
          done: answered,
          total: game.player_count,
        }),
        placeholder: t('…and here is how it ends'),
        send: t('Send my ending'),
        update: t('Update my ending'),
        which: t('Which ending is the best?'),
        winners: (names: string) => t(':names wrote the best ending!', { names }),
      };
  // Endings read on from the beginning; interpretations stand alone.
  const lead = interpreting || meme ? '' : `${finish?.prompt ?? ''} `;
  const credit = meme?.credit ? `${t('Photo:')} ${meme.credit}` : null;

  const ranked = [...(finish?.answers ?? [])].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <LobbyHeader
        game={game}
        inRound={inRound}
        meta={
          <AppText variant="muted" testID="lobby-meta">
            {t(':count / :max players', { count: game.player_count, max: game.max_players })} · {copy.game}
            {memeing ? '' : ` · ${game.phrase_language === 'uk' ? 'Українська' : 'English'}`}
          </AppText>
        }
      >
        {isHost && !inRound ? (
          <Button
            testID="btn-start-finish"
            label={game.status !== 'completed' ? t('Start the game') : memeing ? t('Next picture') : t('Next phrase')}
            loading={busy && pending?.type === 'finish-start'}
            disabled={!canStart || busy}
            onPress={() => run({ type: 'finish-start' })}
          />
        ) : null}
        {isHost && writing ? (
          <Button
            testID="btn-open-vote"
            label={t('Start the vote')}
            variant="secondary"
            disabled={busy || answered < (finish?.min_answers ?? 2)}
            onPress={() =>
              confirm(t("Start the vote now? Players who haven't written yet will miss this round."), () =>
                run({ type: 'finish-voting' }),
              )
            }
          />
        ) : null}
        {isHost && voting ? (
          <Button
            testID="btn-close-voting"
            label={t('Close the vote')}
            variant="secondary"
            disabled={busy}
            onPress={() => confirm(t('Close the vote now and count it?'), () => run({ type: 'finish-close' }))}
          />
        ) : null}
      </LobbyHeader>

      {isHost && game.status === 'recruiting' ? <HostPanel game={game} busy={busy} run={run} /> : null}

      {game.voice_enabled && isPlayer ? <VoicePanel code={game.code} /> : null}

      {finish && game.status !== 'recruiting' ? (
        <Card testID="prompt-card" style={{ borderWidth: 2, borderColor: colors.primary }}>
          <AppText variant="muted">
            {meme ? t('Picture :number', { number: finish.number }) : t('Phrase :number', { number: finish.number })}
          </AppText>
          {meme?.image_url ? (
            <>
              {/* Your caption appears on the picture as you type it. */}
              <MemeImage testID="meme-picture" uri={meme.image_url} alt={meme.prompt} caption={writing ? ending : null} />
              {credit ? (
                <AppText
                  testID="meme-credit"
                  variant="muted"
                  style={{ fontSize: 12 }}
                  onPress={meme.source_url ? () => void Linking.openURL(meme.source_url as string) : undefined}
                >
                  {credit}
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText testID="prompt-text" variant="title">
              {finish.prompt}
            </AppText>
          )}
        </Card>
      ) : null}

      {writing && finish ? (
        <Card testID="writing-card">
          <AppText variant="heading">{copy.write}</AppText>
          <AppText variant="muted">{copy.progress}</AppText>
          {isPlayer ? (
            <>
              <TextField
                testID="input-ending"
                label={copy.placeholder}
                value={ending}
                onChangeText={setEnding}
                maxLength={finish.max_length}
                multiline
              />
              <Button
                testID="btn-send-ending"
                label={finish.my_answer ? copy.update : copy.send}
                loading={busy && pending?.type === 'finish-answer'}
                disabled={busy || !ending.trim()}
                onPress={() => run({ type: 'finish-answer', ending: ending.trim() })}
              />
              {finish.my_answer ? (
                <AppText testID="ending-sent" variant="muted">
                  {t('Sent. You can change it until the vote.')}
                </AppText>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {voting && finish?.answers ? (
        <Card testID="voting-card">
          <AppText variant="heading">{copy.which}</AppText>
          <AppText variant="muted">
            {t(':voted of :total voted. Votes are secret; you can change yours until the vote closes.', {
              voted: finish.voted_user_ids.length,
              total: game.player_count,
            })}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {finish.answers.map((answer) => {
              const chosen = finish.my_vote === answer.position;
              return (
                <Pressable
                  key={answer.position}
                  testID={`btn-vote-${answer.position}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chosen, disabled: answer.mine || busy || !isPlayer }}
                  disabled={answer.mine || busy || !isPlayer}
                  onPress={() => run({ type: 'finish-vote', position: answer.position })}
                  style={{
                    borderWidth: chosen ? 2 : 1,
                    borderColor: chosen ? colors.primary : colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    opacity: answer.mine ? 0.6 : 1,
                  }}
                >
                  {meme?.image_url ? (
                    <>
                      <MemeImage uri={meme.image_url} alt={meme.prompt} caption={answer.text} />
                      {chosen || answer.mine ? (
                        <AppText variant="muted">
                          {chosen ? `✓ ${t('Your vote')}` : t('yours')}
                        </AppText>
                      ) : null}
                    </>
                  ) : (
                    <AppText>
                      {chosen ? '✓ ' : ''}
                      {lead ? <AppText variant="muted">{lead}</AppText> : null}
                      {answer.text}
                      {answer.mine ? ` (${t('yours')})` : ''}
                    </AppText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {result && finish ? (
        <Card
          testID="finish-results"
          style={{ borderWidth: 2, borderColor: result.winner_user_ids.length ? colors.online : colors.border }}
        >
          <AppText variant="heading">
            {result.winner_user_ids.length
              ? copy.winners(result.winner_user_ids.map((id) => name(id)).join(', '))
              : t('Nobody got a vote this time.')}
          </AppText>
          {result.meaning ? (
            <AppText testID="real-meaning">
              <AppText style={{ fontWeight: '600' }}>{t('What it really means:')}</AppText> {result.meaning}
            </AppText>
          ) : null}
          {ranked.map((answer) =>
            meme?.image_url ? (
              <View key={answer.position} style={{ gap: spacing.xs }}>
                <MemeImage uri={meme.image_url} alt={meme.prompt} caption={answer.text} />
                <AppText variant={answer.user_id !== null && result.winner_user_ids.includes(answer.user_id) ? 'body' : 'muted'}>
                  {name(answer.user_id)} · {t(':count votes', { count: answer.votes ?? 0 })}
                </AppText>
              </View>
            ) : (
              <AppText
                key={answer.position}
                variant={answer.user_id !== null && result.winner_user_ids.includes(answer.user_id) ? 'body' : 'muted'}
              >
                {lead}
                {answer.text} — {name(answer.user_id)} · {t(':count votes', { count: answer.votes ?? 0 })}
              </AppText>
            ),
          )}
        </Card>
      ) : null}

      {isPlayer ? <ChatPanel code={game.code} gameId={game.id} /> : null}

      <Roster
        game={game}
        inRound={inRound}
        badge={(player) =>
          writing && finish?.answered_user_ids.includes(player.user.id) ? (
            <Badge label={t('wrote')} tone="muted" />
          ) : voting && finish?.voted_user_ids.includes(player.user.id) ? (
            <Badge label={t('voted')} tone="muted" />
          ) : null
        }
      />

      <RoundHistory game={game} />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
