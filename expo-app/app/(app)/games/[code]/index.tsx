import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, Share, View } from 'react-native';
import { ApiError } from '@/api/errors';
import { isJoinRequested } from '@/api/types';
import { useGame, useJoinGame, useLeaveGame, useLobbyAction, useRefreshOnFocus } from '@/api/queries';
import { useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { OnlineDot } from '@/components/OnlineDot';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { HostPanel } from '@/game/HostPanel';
import { PhraseLobby } from '@/game/PhraseLobby';
import { openPlayerMenu } from '@/game/playerMenu';
import { modeLabels, spyCountFor, statusLabels, tierLabels } from '@/game/labels';
import { ResultsCard } from '@/game/ResultsCard';
import { RoleCard } from '@/game/RoleCard';
import { VotingCard } from '@/game/VotingCard';
import { useI18n } from '@/i18n/I18nProvider';
import { useGameChannel, useOnlineUserIds, useRealtimeConnected } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';

const DEFAULT_MIN_PLAYERS = 3;

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const me = useSignedInUser();
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  // Without a live socket (Pusher unconfigured, network trouble) the lobby
  // would otherwise only update on pull-to-refresh.
  const connected = useRealtimeConnected();
  const game = useGame(code, { poll: !connected });
  const joinGame = useJoinGame();
  const action = useLobbyAction(code);
  const leave = useLeaveGame(code);
  useRefreshOnFocus(game.refetch);
  useGameChannel(game.data?.id, () => void game.refetch());

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') });

  if (game.error instanceof ApiError && game.error.status === 403) {
    return (
      <Screen testID="not-on-operation">
        <Stack.Screen options={{ title: code }} />
        <AppText variant="heading">{t("You're not on this operation")}</AppText>
        <AppText variant="muted">{t('Join with invite code :code to see the roster.', { code })}</AppText>
        <Button
          testID="btn-join-from-lobby"
          label={t('Join Operation')}
          loading={joinGame.isPending}
          onPress={() =>
            joinGame.mutate(code, {
              onSuccess: (result) => {
                if (isJoinRequested(result)) showBanner({ message: t('Request sent. The host will let you in.') });
              },
              onError: (error) =>
                showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Could not join.') }),
            })
          }
        />
      </Screen>
    );
  }

  // Both games share this route (and invite links); Phrase has its own lobby.
  if (game.data?.game_type === 'phrase') {
    return <PhraseLobby game={game.data} refreshing={game.isRefetching} onRefresh={() => void game.refetch()} />;
  }

  const data = game.data;
  const isHost = data?.host_id === me.id;
  const players = data?.players ?? [];
  const mine = players.find((player) => player.user.id === me.id);
  const round = data?.round ?? null;
  const inRound = data?.status === 'active' || data?.status === 'voting';
  const minPlayers = data?.min_players ?? DEFAULT_MIN_PLAYERS;
  const canStart = (data?.player_count ?? 0) >= minPlayers;
  const busy = action.isPending;
  const run = (next: Parameters<typeof action.mutate>[0]) => action.mutate(next, { onError });

  const confirm = (title: string, onConfirm: () => void) =>
    Alert.alert(title, undefined, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Confirm'), style: 'destructive', onPress: onConfirm },
    ]);

  const share = () =>
    Share.share({
      message: t('Join my SpyNet operation ":title" with invite code :code: :link', {
        title: data?.title ?? '',
        code,
        link: `spynet://join/${code}`,
      }),
    });

  return (
    <Screen refreshing={game.isRefetching} onRefresh={() => void game.refetch()}>
      <Stack.Screen options={{ title: data?.title ?? code }} />
      {game.error ? <FormError message={applyServerErrors(game.error, () => {}, [])} /> : null}
      <Card>
        <AppText variant="muted">{t('Invite code')}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText testID="lobby-code" variant="mono">
            {code}
          </AppText>
          <Button testID="btn-share" label={t('Share')} variant="secondary" onPress={() => void share()} />
        </View>
        {data ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="heading" style={{ flex: 1 }}>
                {data.title}
              </AppText>
              <Badge label={statusLabels(t)[data.status]} />
            </View>
            <AppText variant="muted" testID="lobby-meta">
              {t(':count / :max operatives', { count: data.player_count, max: data.max_players })} ·{' '}
              {(data.spy_count ?? spyCountFor(data.player_count)) === 1
                ? t('1 spy')
                : t(':count spies', { count: data.spy_count ?? spyCountFor(data.player_count) })}{' '}
              {data.game_mode ? ` · ${modeLabels(t)[data.game_mode]}` : ''}
              {data.age_tier ? ` · ${tierLabels(t)[data.age_tier].label}` : ''}
            </AppText>
            <AppText>{data.mission_briefing}</AppText>
          </>
        ) : (
          <AppText variant="muted">{t('Loading…')}</AppText>
        )}

        {isHost && data ? (
          <>
            {!inRound ? (
              <Button
                testID="btn-start-round"
                label={data.status === 'completed' ? t('Start next round') : t('Start the game')}
                loading={busy && action.variables?.type === 'start'}
                disabled={!canStart || busy}
                onPress={() => run({ type: 'start' })}
              />
            ) : null}
            {!inRound && !canStart ? (
              <AppText variant="muted">{t('At least :count operatives are required to start.', { count: minPlayers })}</AppText>
            ) : null}
            {data.status === 'active' ? (
              <Button
                testID="btn-start-voting"
                label={t('Call a vote')}
                loading={busy && action.variables?.type === 'voting'}
                onPress={() => run({ type: 'voting' })}
              />
            ) : null}
            {data.status === 'recruiting' ? (
              <Button
                testID="btn-invite-players"
                label={t('Invite Players')}
                variant="secondary"
                onPress={() => router.push(`/games/${code}/invite`)}
              />
            ) : (
              <Button
                testID="btn-reset-game"
                label={t('Back to recruiting')}
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  inRound
                    ? confirm(t('End this round without scoring and reopen recruiting?'), () => run({ type: 'reset' }))
                    : run({ type: 'reset' })
                }
              />
            )}
          </>
        ) : null}
        {!isHost && data?.status === 'recruiting' ? (
          <AppText variant="muted">{t('Waiting for the host to start the game…')}</AppText>
        ) : null}
        <Button
          testID="btn-location-guide"
          label={t('Location guide')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/locations', params: { tier: data?.age_tier ?? 'adults' } })}
        />
      </Card>

      {isHost && data?.status === 'recruiting' ? <HostPanel game={data} busy={busy} run={run} /> : null}

      {data && round && inRound ? <RoleCard key={round.number} game={data} round={round} /> : null}

      {data && round && data.status === 'voting' ? (
        <VotingCard
          game={data}
          round={round}
          meId={me.id}
          isHost={isHost}
          busy={busy}
          onVote={(suspectId) => run({ type: 'vote', suspectId })}
          onClose={() => run({ type: 'tally' })}
        />
      ) : null}

      {data && round?.result && data.status === 'completed' ? (
        <ResultsCard game={data} round={round} result={round.result} />
      ) : null}

      <Card>
        <AppText variant="heading">{t('Roster')}</AppText>
        {[...players]
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
              {data?.status === 'voting' && round?.voted_user_ids.includes(player.user.id) ? (
                <Badge label={t('voted')} tone="muted" />
              ) : null}
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

      {data && !inRound ? (
        <Button
          testID="btn-leave-game"
          label={t('Leave')}
          variant="destructive"
          loading={leave.isPending}
          onPress={() =>
            confirm(
              isHost
                ? t('Leave? Hosting passes to the next player, or the game closes if nobody is left.')
                : t('Leave this operation?'),
              () =>
              leave.mutate(undefined, { onSuccess: () => router.replace('/spy'), onError }),
            )
          }
        />
      ) : null}
    </Screen>
  );
}
