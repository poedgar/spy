import { router, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import { useTrans } from '@/composables/useTrans';
import type { Game } from '@/types/game';

/**
 * What both lobbies share: who the viewer is in this game, a busy flag,
 * and posting lobby actions (with an optional confirmation).
 */
export function useLobby(game: () => Game) {
    const { t } = useTrans();
    const page = usePage<{
        auth: { user: { id: number } };
        errors: Record<string, string>;
    }>();

    const myId = computed(() => page.props.auth.user.id);
    const isHost = computed(() => myId.value === game().host.id);
    const me = computed(() =>
        game().players.find((player) => player.user.id === myId.value),
    );
    const canStart = computed(
        () => game().players.length >= game().min_players,
    );
    const errors = computed(() => page.props.errors);
    const busy = ref(false);

    const statusLabels = computed<Record<Game['status'], string>>(() => ({
        recruiting: t('Recruiting'),
        active: t('Round in progress'),
        voting: t('Voting'),
        completed: t('Round over'),
    }));

    /** Codenames can repeat, so the name tells players apart. */
    function playerName(userId: number | null): string {
        const user = game().players.find(
            (player) => player.user.id === userId,
        )?.user;

        return user
            ? `${user.codename} (${user.name})`
            : t('a departed player');
    }

    function act(
        path: string,
        confirmMessage?: string,
        method: 'post' | 'delete' = 'post',
        url = `/games/${game().code}/${path}`,
    ) {
        if (confirmMessage && !window.confirm(confirmMessage)) {
            return;
        }

        busy.value = true;
        router[method](
            url,
            {},
            { preserveScroll: true, onFinish: () => (busy.value = false) },
        );
    }

    return {
        t,
        myId,
        isHost,
        me,
        canStart,
        errors,
        busy,
        statusLabels,
        playerName,
        act,
    };
}
