import { useState } from 'react';
import { View } from 'react-native';
import { useGuessPhrase } from '@/api/queries';
import type { Game, PhraseRound } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useTheme } from '@/theme/useTheme';
import { HostPanel } from './HostPanel';
import { LobbyHeader } from './LobbyHeader';
import { RoundHistory } from './RoundHistory';
import { RoundTimer } from './RoundTimer';
import { Roster } from './Roster';
import { useLobbyControls } from './useLobbyControls';

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

/** The lobby of a Phrase game: one hidden word each, turns to ask, and guesses at the whole phrase. */
export function PhraseLobby({ game, refreshing, onRefresh }: Props) {
  const { me, t, isHost, canStart, busy, pending, run, confirm, onError, name } = useLobbyControls(game);
  const { spacing, colors } = useTheme();
  const { showBanner } = useBanner();
  const guess = useGuessPhrase(game.code);
  const [revealed, setRevealed] = useState(false);
  const [guessText, setGuessText] = useState('');

  const phrase: PhraseRound | null = game.phrase ?? null;
  const active = game.status === 'active';
  const isAsker = phrase?.asker_user_id === me.id;
  const result = game.status === 'completed' ? (phrase?.result ?? null) : null;

  const submitGuess = () =>
    guess.mutate(guessText.trim(), {
      onSuccess: ({ correct }) => {
        setGuessText('');
        if (!correct) showBanner({ tone: 'error', message: t('Not quite. That cost you a point.') });
      },
      onError,
    });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <LobbyHeader
        game={game}
        inRound={active}
        meta={
          <AppText variant="muted" testID="lobby-meta">
            {t(':count / :max players', { count: game.player_count, max: game.max_players })} ·{' '}
            {game.phrase_language === 'uk' ? t('Ukrainian phrases') : t('English phrases')}
            {game.round_seconds ? ` · ${t(':minutes min rounds', { minutes: game.round_seconds / 60 })}` : ''}
          </AppText>
        }
      >
        {isHost && !active ? (
          <Button
            testID="btn-start-phrase"
            label={game.status === 'completed' ? t('Deal the next phrase') : t('Start the game')}
            loading={busy && pending?.type === 'phrase-start'}
            disabled={!canStart || busy}
            onPress={() => run({ type: 'phrase-start' })}
          />
        ) : null}
        {isHost && active ? (
          <Button
            testID="btn-reveal-phrase"
            label={t('Reveal and end')}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              confirm(t('Show everyone the phrase and end this round without points?'), () =>
                run({ type: 'phrase-reveal' }),
              )
            }
          />
        ) : null}
      </LobbyHeader>

      {isHost && game.status === 'recruiting' ? <HostPanel game={game} busy={busy} run={run} /> : null}

      {active && phrase ? (
        <>
          <Card testID="word-card" style={revealed ? { borderWidth: 2, borderColor: colors.primary } : undefined}>
            <AppText variant="heading">
              {t('Phrase :number · :count words', { number: phrase.number, count: phrase.word_count })}
            </AppText>
            {phrase.ends_at ? <RoundTimer endsAt={phrase.ends_at} onExpire={onRefresh} /> : null}
            {revealed ? (
              <>
                <AppText variant="muted">
                  {t('Your word is number :position of :count', {
                    position: phrase.my_position ?? '?',
                    count: phrase.word_count,
                  })}
                </AppText>
                <AppText testID="my-word" variant="title">
                  {phrase.my_word}
                </AppText>
              </>
            ) : (
              <AppText variant="muted">{t('Your word is hidden. Reveal it when nobody can see your screen.')}</AppText>
            )}
            <Button
              testID="btn-reveal-word"
              label={revealed ? t('Hide my word') : t('Reveal my word')}
              variant="secondary"
              onPress={() => setRevealed((value) => !value)}
            />
          </Card>

          <Card testID="turn-card">
            <AppText variant="heading">{t('Question round :number', { number: phrase.question_round })}</AppText>
            <AppText testID="current-asker">
              {isAsker
                ? t('Your turn: ask another player a question about their word, out loud.')
                : t(':player is asking a question.', { player: name(phrase.asker_user_id) })}
            </AppText>
            {isAsker || isHost ? (
              <Button
                testID="btn-pass-turn"
                label={isAsker ? t('Done, pass the turn') : t('Skip to the next asker')}
                variant="secondary"
                loading={busy && pending?.type === 'phrase-turn'}
                onPress={() => run({ type: 'phrase-turn' })}
              />
            ) : null}
          </Card>

          <Card testID="guess-card">
            <AppText variant="heading">{t('Know the phrase?')}</AppText>
            <AppText variant="muted">
              {t('A right guess wins the game (+:win points). A wrong one costs :penalty point.', {
                win: phrase.scoring.win,
                penalty: Math.abs(phrase.scoring.wrong_guess),
              })}
            </AppText>
            <TextField
              testID="input-phrase-guess"
              label={t('Type the whole phrase')}
              value={guessText}
              onChangeText={setGuessText}
              autoCorrect={false}
            />
            <Button
              testID="btn-guess-phrase"
              label={t('Guess')}
              loading={guess.isPending}
              disabled={!guessText.trim()}
              onPress={submitGuess}
            />
          </Card>
        </>
      ) : null}

      {result ? (
        <Card
          testID="phrase-results"
          style={{ borderWidth: 2, borderColor: result.winner_user_id ? colors.online : colors.border }}
        >
          <AppText variant="heading">
            {result.winner_user_id
              ? t(':player guessed the phrase!', { player: name(result.winner_user_id) })
              : result.ending === 'time_up'
                ? t("Time's up! Nobody guessed the phrase.")
                : t('Nobody guessed it')}
          </AppText>
          <AppText testID="revealed-phrase" variant="title">
            “{result.phrase}”
          </AppText>
          {result.words.map((word) => (
            <AppText key={word.position} variant={word.user_id ? 'body' : 'muted'}>
              {word.position}. {word.word} — {word.user_id ? name(word.user_id) : t('hidden')}
            </AppText>
          ))}
        </Card>
      ) : null}

      {phrase && phrase.guesses.length > 0 && game.status !== 'recruiting' ? (
        <Card testID="guess-log">
          <AppText variant="heading">{t('Guesses')}</AppText>
          {phrase.guesses.map((entry, index) => (
            <AppText
              key={index}
              variant={entry.correct ? 'body' : 'muted'}
              style={entry.correct ? undefined : { textDecorationLine: 'line-through' }}
            >
              {name(entry.user_id)}: “{entry.guess}”
            </AppText>
          ))}
        </Card>
      ) : null}

      <Roster
        game={game}
        inRound={active}
        badge={(player) =>
          active && phrase?.asker_user_id === player.user.id ? <Badge label={t('asking')} tone="muted" /> : null
        }
      />

      <RoundHistory game={game} />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}
