import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useTrans } from '@/composables/useTrans';
import echo from '@/echo';

interface InvitationSentPayload {
    invitation_id: number;
    game_title: string;
    game_code: string;
    game_type?: 'spy' | 'phrase';
    from_codename: string;
}

interface JoinAnsweredPayload {
    approved: boolean;
    game_code: string;
    game_title: string;
}

/**
 * Live notices on the user's private channel: new invitations, and the
 * host's answer to a request to join.
 */
export function useInvitationNotifications(currentUserId: number): void {
    const { t } = useTrans();

    onMounted(() => {
        echo.private(`user.${currentUserId}`)
            .listen('.invitation.sent', (payload: InvitationSentPayload) => {
                toast.info(
                    t(':codename invited you to :title', {
                        codename: payload.from_codename,
                        title: payload.game_title,
                    }),
                    {
                        action: {
                            label: t('Open'),
                            onClick: () =>
                                router.visit(
                                    payload.game_type === 'phrase'
                                        ? '/games/phrase'
                                        : '/games/spy',
                                ),
                        },
                    },
                );
            })
            .listen('.join.answered', (payload: JoinAnsweredPayload) => {
                if (!payload.approved) {
                    toast.error(
                        t('The host of :title turned down your request.', {
                            title: payload.game_title,
                        }),
                    );

                    return;
                }

                toast.success(
                    t('The host let you into :title.', {
                        title: payload.game_title,
                    }),
                );
                router.visit(`/games/${payload.game_code}`);
            });
    });

    onBeforeUnmount(() => {
        echo.leave(`user.${currentUserId}`);
    });
}
