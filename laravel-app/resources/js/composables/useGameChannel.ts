import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import echo from '@/echo';

/**
 * Reloads the lobby whenever the game changes. Events carry no game state:
 * what each player may see depends on their secret role, so the page asks
 * the server for its own view.
 */
export function useGameChannel(gameId: number): void {
    const reload = () => router.reload({ only: ['game'] });

    onMounted(() => {
        echo.private(`game.${gameId}`)
            .listen('.player.joined', reload)
            .listen('.game.updated', reload);
    });

    onBeforeUnmount(() => {
        echo.leave(`game.${gameId}`);
    });
}
