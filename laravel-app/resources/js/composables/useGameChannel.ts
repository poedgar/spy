import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import echo from '@/echo';

export function useGameChannel(gameId: number): void {
    onMounted(() => {
        echo.private(`game.${gameId}`).listen('.player.joined', () => {
            router.reload({ only: ['game'] });
        });
    });

    onBeforeUnmount(() => {
        echo.leave(`game.${gameId}`);
    });
}
