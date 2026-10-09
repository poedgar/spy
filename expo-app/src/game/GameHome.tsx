import type { UseQueryResult } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAcceptInvitation, useDeclineInvitation, useRefreshOnFocus } from '@/api/queries';
import type { GameType, SpyHome } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { NotificationBell } from '@/components/NotificationBell';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';
import { statusLabels } from './labels';
import { OpenGames } from './OpenGames';

interface Props {
  gameType: GameType;
  home: UseQueryResult<SpyHome>;
  title: string;
  createLabel: string;
  joinLabel: string;
  gamesHeading: string;
  /** Kept per game: tests and Maestro flows address these. */
  testIDs: { create: string; join: string; game: (code: string) => string };
  /** Extra buttons under create/join (e.g. Spy's location guide). */
  extras?: ReactNode;
}

/** A game's home: create and join, waiting invitations, open games, and the player's own games. */
export function GameHome({ gameType, home, title, createLabel, joinLabel, gamesHeading, testIDs, extras }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, spacing } = useTheme();
  const { showBanner } = useBanner();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  useRefreshOnFocus(home.refetch);

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') });

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <Stack.Screen options={{ title, headerRight: () => <NotificationBell /> }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button testID={testIDs.create} label={createLabel} onPress={() => router.push(`/${gameType}/create`)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID={testIDs.join} label={joinLabel} variant="secondary" onPress={() => router.push(`/${gameType}/join`)} />
        </View>
      </View>
      {extras}

      {home.error ? <FormError message={applyServerErrors(home.error, () => {}, [])} /> : null}

      <AppText variant="heading">{t('Pending Invitations')}</AppText>
      {home.data?.pending_invitations.length ? (
        home.data.pending_invitations.map((invitation) => (
          <Card
            key={invitation.id}
            testID={`invitation-${invitation.id}`}
            style={String(invitation.id) === highlight ? { borderWidth: 2, borderColor: colors.ring } : undefined}
          >
            <AppText>
              {t(':codename invited you to :title', { codename: invitation.from_codename, title: invitation.game_title })}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-accept-${invitation.id}`}
                  label={t('Accept')}
                  loading={accept.isPending && accept.variables === invitation.id}
                  onPress={() => accept.mutate(invitation.id, { onSuccess: (game) => router.push(`/games/${game.code}`), onError })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-decline-${invitation.id}`}
                  label={t('Decline')}
                  variant="secondary"
                  loading={decline.isPending && decline.variables === invitation.id}
                  onPress={() => decline.mutate(invitation.id, { onError })}
                />
              </View>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState message={home.isLoading ? t('Loading…') : t('No pending invitations.')} />
      )}

      <OpenGames games={home.data?.open_games} loading={home.isLoading} />

      <AppText variant="heading">{gamesHeading}</AppText>
      {home.data?.games.length ? (
        home.data.games.map((game) => (
          <Pressable key={game.id} testID={testIDs.game(game.code)} onPress={() => router.push(`/games/${game.code}`)}>
            <Card>
              <AppText variant="heading">{game.title}</AppText>
              <AppText variant="muted">
                {game.code} · {t(':count / :max players', { count: game.player_count, max: game.max_players })} ·{' '}
                {statusLabels(t)[game.status]}
              </AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState message={home.isLoading ? t('Loading…') : t('No games yet. Create one or join by code.')} />
      )}
    </Screen>
  );
}
