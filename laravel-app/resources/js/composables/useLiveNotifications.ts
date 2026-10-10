import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useTrans } from '@/composables/useTrans';
import echo from '@/echo';
import type { AppNotification } from '@/types/notifications';

/** How often the bell refreshes while the realtime connection is down. */
const FALLBACK_POLL_MS = 30000;

/**
 * How often an open, visible tab checks in anyway, so the server knows the
 * player is online (see RecordLastSeen) even when nothing needs refreshing.
 */
const HEARTBEAT_MS = 60000;

/** Props a notification can change, on whichever page is open. */
const AFFECTED_PROPS = [
    'notifications',
    'pendingInvitations',
    'openGames',
    'games',
];

export function openNotification(
    notification: Pick<AppNotification, 'id'>,
): void {
    router.post(`/notifications/${notification.id}/open`);
}

/**
 * Live notifications on the user's private channel: a toast, a refreshed
 * bell (and lists), and a system notification when the tab is in the
 * background and the player allowed them.
 */
export function useLiveNotifications(currentUserId: number): void {
    const { t } = useTrans();
    const connection = echo.connector.pusher.connection;
    let timer: number | undefined;
    let subscribed = false;

    const refresh = () => router.reload({ only: AFFECTED_PROPS });

    onMounted(() => {
        echo.private(`user.${currentUserId}`)
            .subscribed(() => (subscribed = true))
            .error(() => (subscribed = false))
            .notification((notification: AppNotification) => {
                refresh();

                toast.info(notification.title, {
                    description: notification.body,
                    action: {
                        label: t('Open'),
                        onClick: () => openNotification(notification),
                    },
                });

                if (
                    document.visibilityState === 'hidden' &&
                    'Notification' in window &&
                    Notification.permission === 'granted'
                ) {
                    const system = new Notification(notification.title, {
                        body: notification.body,
                        tag: notification.id,
                    });
                    system.onclick = () => {
                        window.focus();
                        openNotification(notification);
                    };
                }
            });

        // Without a socket (or with the channel refused) nothing arrives
        // live, so check in now and then; otherwise still check in about
        // once a minute while visible.
        let lastCheck = Date.now();
        timer = window.setInterval(() => {
            const heartbeatDue =
                document.visibilityState === 'visible' &&
                Date.now() - lastCheck >= HEARTBEAT_MS;

            const live = connection.state === 'connected' && subscribed;

            if (!live || heartbeatDue) {
                lastCheck = Date.now();
                router.reload({ only: ['notifications'] });
            }
        }, FALLBACK_POLL_MS);
    });

    onBeforeUnmount(() => {
        window.clearInterval(timer);
        echo.leave(`user.${currentUserId}`);
    });
}
