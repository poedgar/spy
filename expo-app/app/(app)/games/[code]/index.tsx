import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, View } from 'react-native';
import { ApiError } from '@/api/errors';
import { useGame, useJoinGame, useRefreshOnFocus } from '@/api/queries';
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
import { useGameChannel, useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const me = useSignedInUser();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const game = useGame(code);
  const joinGame = useJoinGame();
  useRefreshOnFocus(game.refetch);
  useGameChannel(game.data?.id, () => void game.refetch());

  if (game.error instanceof ApiError && game.error.status === 403) {
    return (
      <Screen testID="not-on-operation">
        <Stack.Screen options={{ title: code }} />
        <AppText variant="heading">You&apos;re not on this operation</AppText>
        <AppText variant="muted">Join with invite code {code} to see the roster.</AppText>
        <Button
          testID="btn-join-from-lobby"
          label="Join Operation"
          loading={joinGame.isPending}
          onPress={() =>
            joinGame.mutate(code, {
              onError: (error) =>
                showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Could not join.' }),
            })
          }
        />
      </Screen>
    );
  }

  const data = game.data;
  const isHost = data?.host_id === me.id;

  const share = () =>
    Share.share({
      message: `Join my SpyNet operation "${data?.title}" with invite code ${code}: spynet://join/${code}`,
    });

  return (
    <Screen refreshing={game.isRefetching} onRefresh={() => void game.refetch()}>
      <Stack.Screen options={{ title: data?.title ?? code }} />
      {game.error ? <FormError message={applyServerErrors(game.error, () => {}, [])} /> : null}
      <Card>
        <AppText variant="muted">Invite code</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText testID="lobby-code" variant="mono">{code}</AppText>
          <Button testID="btn-share" label="Share" variant="secondary" onPress={() => void share()} />
        </View>
        {data ? (
          <>
            <AppText variant="heading">{data.title}</AppText>
            <AppText variant="muted">
              {data.player_count} / {data.max_players} operatives · {data.game_mode} · {data.status}
            </AppText>
            <AppText>{data.mission_briefing}</AppText>
          </>
        ) : (
          <AppText variant="muted">Loading…</AppText>
        )}
        {isHost && data?.status === 'recruiting' ? (
          <Button testID="btn-invite-players" label="Invite Players" onPress={() => router.push(`/games/${code}/invite`)} />
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">Roster</AppText>
        {data?.players?.map((player) => (
          <View
            key={player.id}
            testID={`roster-${player.user.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <OnlineDot online={online.has(player.user.id)} />
            <AppText style={{ flex: 1 }}>{player.user.codename}</AppText>
            {player.is_host ? <Badge label="Host" /> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
