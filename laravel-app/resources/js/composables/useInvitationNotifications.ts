import { onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import echo from '@/echo';

interface InvitationSentPayload {
    invitation_id: number;
    game_title: string;
    game_code: string;
    from_codename: string;
}

export function useInvitationNotifications(currentUserId: number): void {
    onMounted(() => {
        echo
            .private(`user.${currentUserId}`)
            .listen('.invitation.sent', (payload: InvitationSentPayload) => {
                toast.info(`${payload.from_codename} invited you to ${payload.game_title}`);
            });
    });

    onBeforeUnmount(() => {
        echo.leave(`user.${currentUserId}`);
    });
}
