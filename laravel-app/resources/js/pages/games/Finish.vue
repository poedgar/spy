<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import CreateFinishForm from '@/components/CreateFinishForm.vue';
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
            { title: 'Finish the Phrase', href: '/games/finish' },
        ],
    },
});

const { t } = useTrans();
</script>

<template>
    <Head :title="t('Finish the Phrase')" />

    <GameHome
        game-type="finish"
        :games="games"
        :pending-invitations="pendingInvitations"
        :open-games="openGames"
    >
        <template #create>
            <CreateFinishForm />
        </template>
    </GameHome>
</template>
