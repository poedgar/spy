import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useGuessPhrase, useLeaveGame, useLobbyAction } from '@/api/queries';
import type { Game, PhraseRound } from '@/api/types';
import { useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OnlineDot } from '@/components/OnlineDot';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';
import { operativeName, statusLabels } from './labels';

const DEFAULT_MIN_PLAYERS = 3;

interface Props {
  game: Game;
  refreshing: boolean;
  onRefresh(): void;
}

/** The lobby of a Phrase game: one hidden word each, turns to ask, and guesses at the whole phrase. */
export function PhraseLobby({ game, refreshing, onRefresh }: Props) {
  const router = useRouter();
  const me = useSignedInUser();
  const { t } = useI18n();
  const { spacing, colors } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const action = useLobbyAction(game.code);
  const guess = useGuessPhrase(game.code);
  const leave = useLeaveGame(game.code);
  const [revealed, setRevealed] = useState(false);
  const [guessText, setGuessText] = useState('');

  const players = game.players ?? [];
  const phrase: PhraseRound | null = game.phrase ?? null;
  const isHost = game.host_id === me.id;
  const active = game.status === 'active';
  const mine = players.find((player) => player.user.id === me.id);
  const canStart = game.player_count >= (game.min_players ?? DEFAULT_MIN_PLAYERS);
  const isAsker = phrase?.asker_user_id === me.id;
  const busy = action.isPending;
  const name = (userId: number | null) => operativeName(players, userId, t('a departed player'));

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') });
  const run = (next: Parameters<typeof action.mutate>[0]) => action.mutate(next, { onError });
  const confirm = (title: string, onConfirm: () => void) =>
    Alert.alert(title, undefined, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Confirm'), style: 'destructive', onPress: onConfirm },
    ]);

  const submitGuess = () =>
    guess.mutate(guessText.trim(), {
      onSuccess: ({ correct }) => {
        setGuessText('');
        if (!correct) showBanner({ tone: 'error', message: t('Not quite. That cost you a point.') });
      },
      onError,
    });

  const share = () =>
    Share.share({
      message: t('Join my Phrase game ":title" with invite code :code: :link', {
        title: game.title,
        code: game.code,
        link: `spynet://join/${game.code}`,
      }),
    });

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: game.title }} />
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
        <AppText variant="muted">
          {t(':count / :max players', { count: game.player_count, max: game.max_players })} ·{' '}
          {game.phrase_language === 'uk' ? t('Ukrainian phrases') : t('English phrases')}
        </AppText>

        {isHost && !active ? (
          <>
            <Button
              testID="btn-start-phrase"
              label={game.status === 'completed' ? t('Deal the next phrase') : t('Start the game')}
              loading={busy && action.variables?.type === 'phrase-start'}
              disabled={!canStart || busy}
              onPress={() => run({ type: 'phrase-start' })}
            />
            {!canStart ? (
              <AppText variant="muted">
                {t('At least :count players are required to start.', { count: game.min_players ?? DEFAULT_MIN_PLAYERS })}
              </AppText>
            ) : null}
          </>
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
              active
                ? confirm(t('End this phrase without scoring and reopen recruiting?'), () => run({ type: 'reset' }))
                : run({ type: 'reset' })
            }
          />
        ) : null}
        {!isHost && game.status === 'recruiting' ? (
          <AppText variant="muted">{t('Waiting for the host to start the game…')}</AppText>
        ) : null}
      </Card>

      {active && phrase ? (
        <>
          <Card testID="word-card" style={revealed ? { borderWidth: 2, borderColor: colors.primary } : undefined}>
            <AppText variant="heading">
              {t('Phrase :number · :count words', { number: phrase.number, count: phrase.word_count })}
            </AppText>
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
                loading={busy && action.variables?.type === 'phrase-turn'}
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

      {game.status === 'completed' && phrase?.result ? (
        <Card testID="phrase-results" style={{ borderWidth: 2, borderColor: colors.online }}>
          <AppText variant="heading">
            {t(':player guessed the phrase!', { player: name(phrase.result.winner_user_id) })}
          </AppText>
          <AppText testID="revealed-phrase" variant="title">
            “{phrase.result.phrase}”
          </AppText>
          {phrase.result.words.map((word) => (
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

      <Card>
        <AppText variant="heading">{t('Players')}</AppText>
        {[...players]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .map((player) => (
            <View
              key={player.id}
              testID={`roster-${player.user.id}`}
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
              {active && phrase?.asker_user_id === player.user.id ? <Badge label={t('asking')} tone="muted" /> : null}
              <AppText variant="muted" testID={`score-${player.user.id}`}>
                {t(':score pts', { score: player.score ?? 0 })}
              </AppText>
            </View>
          ))}
        {mine && !active ? (
          <Button
            testID="btn-toggle-ready"
            label={mine.status === 'ready' ? t('Mark me not ready') : t('Mark me ready')}
            variant="secondary"
            disabled={busy}
            onPress={() => run({ type: 'ready' })}
          />
        ) : null}
      </Card>

      {!isHost && !active ? (
        <Button
          testID="btn-leave-game"
          label={t('Leave')}
          variant="destructive"
          loading={leave.isPending}
          onPress={() =>
            confirm(t('Leave this game?'), () =>
              leave.mutate(undefined, { onSuccess: () => router.replace('/phrase'), onError }),
            )
          }
        />
      ) : null}
    </Screen>
  );
}
