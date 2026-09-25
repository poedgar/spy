<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
import { dashboard } from '@/routes';

interface GameRow {
    id: number;
    code: string;
    title: string;
    status: string;
}

interface PendingInvitationRow {
    id: number;
    game_title: string;
    game_code: string;
    from_codename: string;
}

defineProps<{
    games: GameRow[];
    pendingInvitations: PendingInvitationRow[];
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Games',
                href: dashboard(),
            },
            {
                title: 'Spy',
                href: '/games/spy',
            },
        ],
    },
});

const page = usePage<{ errors: { invitation?: string } }>();
</script>

<template>
    <Head title="Spy" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div class="grid gap-4 md:grid-cols-2">
            <CreateGameForm />
            <JoinGameForm />
        </div>

        <div
            id="games-list"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">Your Operations</h2>
            <ul class="space-y-1">
                <li v-for="game in games" :key="game.id">
                    <Link :href="`/games/${game.code}`" class="font-mono"
                        >{{ game.title }} ({{ game.code }})</Link
                    >
                </li>
            </ul>
        </div>

        <div
            v-if="pendingInvitations.length > 0 || page.props.errors.invitation"
            id="pending-invitations"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">Pending Invitations</h2>
            <p
                v-if="page.props.errors.invitation"
                class="mb-2 text-sm text-red-600"
            >
                {{ page.props.errors.invitation }}
            </p>
            <ul class="space-y-2">
                <li
                    v-for="invitation in pendingInvitations"
                    :key="invitation.id"
                    class="flex items-center justify-between"
                >
                    <span
                        >{{ invitation.game_title }} — invited by
                        {{ invitation.from_codename }}</span
                    >
                    <span class="flex gap-2">
                        <Link
                            :href="`/invitations/${invitation.id}/accept`"
                            method="post"
                            as="button"
                            class="text-sm text-primary underline underline-offset-4"
                        >
                            Accept
                        </Link>
                        <Link
                            :href="`/invitations/${invitation.id}/decline`"
                            method="post"
                            as="button"
                            class="text-sm text-muted-foreground underline underline-offset-4"
                        >
                            Decline
                        </Link>
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>
