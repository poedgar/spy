<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import CreateSongForm from '@/components/CreateSongForm.vue';
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
            { title: 'Sing It Out', href: '/games/song' },
        ],
    },
});

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Sing It Out')" />

    <GameHome
        game-type="song"
        :games="games"
        :pending-invitations="pendingInvitations"
        :open-games="openGames"
    >
        <template #create>
            <CreateSongForm />
        </template>
    </GameHome>
</template>
