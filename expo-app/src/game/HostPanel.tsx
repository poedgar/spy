import { Switch, View } from 'react-native';
import type { useLobbyAction } from '@/api/queries';
import type { Game } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/useTheme';

type Run = (action: Parameters<ReturnType<typeof useLobbyAction>['mutate']>[0]) => void;

/**
 * The host's recruiting to-do list, shared by both games: whether new
 * players need approval, who is waiting, and invitations not taken up.
 */
export function HostPanel({ game, busy, run }: { game: Game; busy: boolean; run: Run }) {
  const { t } = useI18n();
  const { spacing } = useTheme();

  return (
    <Card testID="host-panel">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <AppText>{t('Approve new players')}</AppText>
          <AppText variant="muted">
            {t('People joining with the code ask first, and you let them in. Invited players skip the queue.')}
          </AppText>
        </View>
        <Switch
          testID="toggle-approval"
          value={Boolean(game.requires_approval)}
          disabled={busy}
          onValueChange={(requiresApproval) => run({ type: 'approval', requiresApproval })}
        />
      </View>

      {game.join_requests?.length ? (
        <>
          <AppText variant="heading">{t('Asking to join')}</AppText>
          {game.join_requests.map((request) => (
            <View key={request.id} testID={`join-request-${request.id}`} style={{ gap: spacing.xs }}>
              <AppText>
                {request.user.codename} <AppText variant="muted">({request.user.name})</AppText>
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    testID={`btn-approve-${request.id}`}
                    label={t('Let in')}
                    disabled={busy}
                    onPress={() => run({ type: 'answer-request', requestId: request.id, approve: true })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    testID={`btn-decline-request-${request.id}`}
                    label={t('Decline')}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => run({ type: 'answer-request', requestId: request.id, approve: false })}
                  />
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {game.invitations?.length ? (
        <>
          <AppText variant="heading">{t('Invited, not joined')}</AppText>
          {game.invitations.map((invitation) => (
            <View key={invitation.id} testID={`outstanding-${invitation.id}`} style={{ gap: spacing.xs }}>
              <AppText>
                {invitation.user.codename}{' '}
                <AppText variant="muted">
                  · {invitation.status === 'declined' ? t('declined') : t('no answer yet')}
                </AppText>
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    testID={`btn-reinvite-${invitation.id}`}
                    label={t('Invite again')}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => run({ type: 'reinvite', userId: invitation.user.id })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    testID={`btn-cancel-invitation-${invitation.id}`}
                    label={t('Cancel invitation')}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => run({ type: 'cancel-invitation', invitationId: invitation.id })}
                  />
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}
