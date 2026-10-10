import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { TextField } from '@/components/TextField';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { sortByPresence } from '@/realtime/sortByPresence';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/i18n/I18nProvider';

export default function InvitePlayers() {
  const { t } = useI18n();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const [search, setSearch] = useState('');
  const users = useInvitableUsers(code, search);
  const invite = useInvite(code);
  useRefreshOnFocus(users.refetch);

  // Online as the server saw it, or live from the realtime presence channel.
  const onlineIds = useMemo(
    () => new Set([...online, ...(users.data ?? []).filter((user) => user.online).map((user) => user.id)]),
    [users.data, online],
  );
  const sorted = useMemo(() => sortByPresence(users.data ?? [], onlineIds), [users.data, onlineIds]);

  return (
    <Screen refreshing={users.isRefetching} onRefresh={() => void users.refetch()}>
      <Stack.Screen options={{ title: t('Invite Players') }} />
      {users.error ? <FormError message={applyServerErrors(users.error, () => {}, [])} /> : null}
      <TextField
        testID="input-invite-search"
        label={t('Search players by name or codename')}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {sorted.length === 0 && !users.isLoading ? (
        <EmptyState
          message={
            search.trim().length >= 2
              ? t('Nobody matches that search.')
              : t('Players online now and people you have played with appear here. Search to find anyone else.')
          }
        />
      ) : null}
      {sorted.map((user) => (
        <Card key={user.id} testID={`invitable-${user.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <OnlineDot online={onlineIds.has(user.id)} />
            <View style={{ flex: 1 }}>
              <AppText>{user.codename}</AppText>
              <AppText variant="muted">{user.name}</AppText>
            </View>
            {user.invite_status === 'pending' ? (
              <Badge label={t('Pending')} tone="muted" />
            ) : (
              <Button
                testID={`btn-invite-${user.id}`}
                label={t('Invite')}
                loading={invite.isPending && invite.variables === user.id}
                onPress={() =>
                  invite.mutate(user.id, {
                    onError: (error) =>
                      showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Could not invite.') }),
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
