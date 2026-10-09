import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/api/errors';
import { useGame, useJoinGame, useRefreshOnFocus } from '@/api/queries';
import { isJoinRequested } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { PhraseLobby } from '@/game/PhraseLobby';
import { SpyLobby } from '@/game/SpyLobby';
import { useI18n } from '@/i18n/I18nProvider';
import { useGameChannel, useRealtimeConnected } from '@/realtime/RealtimeProvider';

/** Both games share this route (and invite links); each has its own lobby. */
export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { showBanner } = useBanner();
  // Without a live socket (Pusher unconfigured, network trouble) the lobby
  // would otherwise only update on pull-to-refresh.
  const connected = useRealtimeConnected();
  const game = useGame(code, { poll: !connected });
  const joinGame = useJoinGame();
  useRefreshOnFocus(game.refetch);
  useGameChannel(game.data?.id, () => void game.refetch());

  const refresh = () => void game.refetch();

  if (game.error instanceof ApiError && game.error.status === 404) {
    return (
      <Screen testID="game-gone">
        <Stack.Screen options={{ title: code }} />
        <AppText variant="heading">{t('That game is no longer available.')}</AppText>
        <AppText variant="muted">{t('The host may have closed it.')}</AppText>
        <Button testID="btn-back-to-games" label={t('Games')} onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

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

  if (!game.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: code }} />
        {game.error ? <FormError message={applyServerErrors(game.error, () => {}, [])} /> : null}
        <AppText variant="muted">{t('Loading…')}</AppText>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: game.data.title }} />
      {game.data.game_type === 'phrase' ? (
        <PhraseLobby game={game.data} refreshing={game.isRefetching} onRefresh={refresh} />
      ) : (
        <SpyLobby game={game.data} refreshing={game.isRefetching} onRefresh={refresh} />
      )}
    </>
  );
}
