import { View } from 'react-native';
import { useJoinRequest } from '@/api/queries';
import type { OpenGame } from '@/api/types';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';
import { modeLabels, tierLabels } from './labels';

/** Games looking for players: ask the host for a seat, no code needed. */
export function OpenGames({ games, loading }: { games: OpenGame[] | undefined; loading: boolean }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const joinRequest = useJoinRequest();

  const details = (game: OpenGame) =>
    game.game_type === 'phrase'
      ? game.phrase_language === 'uk'
        ? t('Ukrainian phrases')
        : t('English phrases')
      : [game.game_mode ? modeLabels(t)[game.game_mode] : null, tierLabels(t)[game.age_tier].label]
          .filter(Boolean)
          .join(' · ');

  const send = (game: OpenGame, cancel = false) =>
    joinRequest.mutate(
      { code: game.code, cancel },
      {
        onSuccess: () => {
          if (!cancel) showBanner({ message: t('Request sent. The host will let you in.') });
        },
        onError: (error) =>
          showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? t('Something went wrong.') }),
      },
    );

  return (
    <>
      <AppText variant="heading">{t('Open games')}</AppText>
      <AppText variant="muted">{t('Games looking for players. Ask to join and the host decides.')}</AppText>
      {games?.length ? (
        games.map((game) => {
          const busy = joinRequest.isPending && joinRequest.variables?.code === game.code;
          return (
            <Card key={game.id} testID={`open-game-${game.code}`}>
              <AppText variant="heading">{game.title}</AppText>
              <AppText variant="muted">
                {t('Host')}: {game.host_codename} ·{' '}
                {t(':count / :max players', { count: game.player_count, max: game.max_players })} · {details(game)}
              </AppText>
              {game.my_request === 'pending' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Badge label={t('Requested')} />
                  <View style={{ flex: 1 }}>
                    <Button
                      testID={`btn-cancel-request-${game.code}`}
                      label={t('Cancel request')}
                      variant="secondary"
                      loading={busy}
                      onPress={() => send(game, true)}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  {game.my_request === 'declined' ? <Badge label={t('declined')} tone="muted" /> : null}
                  <Button
                    testID={`btn-request-${game.code}`}
                    label={game.my_request === 'declined' ? t('Ask again') : t('Ask to join')}
                    loading={busy}
                    onPress={() => send(game)}
                  />
                </View>
              )}
            </Card>
          );
        })
      ) : (
        <EmptyState
          message={loading ? t('Loading…') : t('No open games right now. Create one and others can find it here.')}
        />
      )}
    </>
  );
}
