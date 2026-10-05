import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useAcceptInvitation, useDeclineInvitation, useRefreshOnFocus, useSpyHome } from '@/api/queries';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useTheme } from '@/theme/useTheme';

export default function SpyHome() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, spacing } = useTheme();
  const { showBanner } = useBanner();
  const home = useSpyHome();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  useRefreshOnFocus(home.refetch);

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Something went wrong.' });

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <Stack.Screen options={{ title: 'Spy' }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button testID="btn-open-create" label="Create Operation" onPress={() => router.push('/spy/create')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID="btn-open-join" label="Join Operation" variant="secondary" onPress={() => router.push('/spy/join')} />
        </View>
      </View>

      {home.error ? <FormError message={applyServerErrors(home.error, () => {}, [])} /> : null}

      <AppText variant="heading">Pending Invitations</AppText>
      {home.data?.pending_invitations.length ? (
        home.data.pending_invitations.map((invitation) => (
          <Card
            key={invitation.id}
            testID={`invitation-${invitation.id}`}
            style={String(invitation.id) === highlight ? { borderWidth: 2, borderColor: colors.ring } : undefined}
          >
            <AppText>
              {invitation.from_codename} invited you to {invitation.game_title}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-accept-${invitation.id}`}
                  label="Accept"
                  loading={accept.isPending && accept.variables === invitation.id}
                  onPress={() =>
                    accept.mutate(invitation.id, {
                      onSuccess: (game) => router.push(`/games/${game.code}`),
                      onError,
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-decline-${invitation.id}`}
                  label="Decline"
                  variant="secondary"
                  loading={decline.isPending && decline.variables === invitation.id}
                  onPress={() => decline.mutate(invitation.id, { onError })}
                />
              </View>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState message={home.isLoading ? 'Loading…' : 'No pending invitations.'} />
      )}

      <AppText variant="heading">Your Operations</AppText>
      {home.data?.games.length ? (
        home.data.games.map((game) => (
          <Pressable key={game.id} testID={`operation-${game.code}`} onPress={() => router.push(`/games/${game.code}`)}>
            <Card>
              <AppText variant="heading">{game.title}</AppText>
              <AppText variant="muted">
                {game.code} · {game.player_count} / {game.max_players} operatives · {game.status}
              </AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState message={home.isLoading ? 'Loading…' : 'No operations yet. Create one or join by code.'} />
      )}
    </Screen>
  );
}
