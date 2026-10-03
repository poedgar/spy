import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useInvitableUsers, useInvite, useRefreshOnFocus } from '@/api/queries';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { OnlineDot } from '@/components/OnlineDot';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { sortByPresence } from '@/realtime/sortByPresence';
import { useTheme } from '@/theme/useTheme';

export default function InvitePlayers() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const users = useInvitableUsers(code);
  const invite = useInvite(code);
  useRefreshOnFocus(users.refetch);

  const sorted = useMemo(() => sortByPresence(users.data ?? [], online), [users.data, online]);

  return (
    <Screen refreshing={users.isRefetching} onRefresh={() => void users.refetch()}>
      <Stack.Screen options={{ title: 'Invite Players' }} />
      {users.error ? <FormError message={applyServerErrors(users.error, () => {}, [])} /> : null}
      {sorted.length === 0 && !users.isLoading ? <EmptyState message="Everyone is already on this operation." /> : null}
      {sorted.map((user) => (
        <Card key={user.id} testID={`invitable-${user.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <OnlineDot online={online.has(user.id)} />
            <View style={{ flex: 1 }}>
              <AppText>{user.codename}</AppText>
              <AppText variant="muted">{user.name}</AppText>
            </View>
            {user.invite_status === 'pending' ? (
              <Badge label="Pending" tone="muted" />
            ) : (
              <Button
                testID={`btn-invite-${user.id}`}
                label="Invite"
                loading={invite.isPending && invite.variables === user.id}
                onPress={() =>
                  invite.mutate(user.id, {
                    onError: (error) =>
                      showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Could not invite.' }),
                  })
                }
              />
            )}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
