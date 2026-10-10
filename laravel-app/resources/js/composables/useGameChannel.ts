import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import echo from '@/echo';

/** How often to refresh the lobby while the realtime connection is down. */
const FALLBACK_POLL_MS = 5000;

/**
 * Reloads the lobby whenever the game changes. Events carry no game state:
 * what each player may see depends on their secret role, so the page asks
 * the server for its own view.
 *
 * Websockets can be unavailable (Pusher not configured, a flaky network),
 * so while the connection is down, or the game's channel isn't subscribed
 * (e.g. its authorization failed), the lobby polls instead. It reloads once
 * on reconnecting to catch anything missed in between.
 */
export function useGameChannel(gameId: number): void {
    const reload = () => router.reload({ only: ['game'] });
    const connection = echo.connector.pusher.connection;
    let timer: number | undefined;
    let subscribed = false;

    const onStateChange = ({
        previous,
        current,
    }: {
        previous: string;
        current: string;
    }) => {
        if (current === 'connected' && previous !== 'initialized') {
            reload();
        }
    };

    onMounted(() => {
        echo.private(`game.${gameId}`)
            .subscribed(() => (subscribed = true))
            .error(() => (subscribed = false))
            .listen('.player.joined', reload)
            .listen('.game.updated', reload);

        connection.bind('state_change', onStateChange);

        timer = window.setInterval(() => {
            const live = connection.state === 'connected' && subscribed;

            if (!live && document.visibilityState === 'visible') {
                reload();
            }
        }, FALLBACK_POLL_MS);
    });

    onBeforeUnmount(() => {
        window.clearInterval(timer);
        connection.unbind('state_change', onStateChange);
        echo.leave(`game.${gameId}`);
    });
}
