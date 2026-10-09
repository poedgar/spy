<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import GameHome, {
    type PendingInvitationRow,
} from '@/components/game/GameHome.vue';
import { useTrans } from '@/composables/useTrans';
import { dashboard } from '@/routes';
import type { Game, OpenGame } from '@/types/game';

defineProps<{
    games: Omit<Game, 'host' | 'players' | 'round'>[];
    pendingInvitations: PendingInvitationRow[];
    openGames: OpenGame[];
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            { title: 'Games', href: dashboard() },
            { title: 'Spy', href: '/games/spy' },
        ],
    },
});

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Spy')" />

    <GameHome
        game-type="spy"
        :games="games"
        :pending-invitations="pendingInvitations"
        :open-games="openGames"
    >
        <template #create>
            <CreateGameForm />
        </template>
    </GameHome>
</template>
