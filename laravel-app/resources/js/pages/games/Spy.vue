<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import { Badge } from '@/components/ui/badge';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
import { useTrans } from '@/composables/useTrans';
import { dashboard } from '@/routes';
import type { Game } from '@/types/game';

interface PendingInvitationRow {
    id: number;
    game_title: string;
    game_code: string;
    from_codename: string;
}

defineProps<{
    games: Omit<Game, 'host' | 'players' | 'round'>[];
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

const { t } = useTrans();
const page = usePage<{
    auth: { user: { id: number } };
    errors: { invitation?: string };
}>();

const statusLabel = (status: Game['status']) =>
    ({
        recruiting: t('Recruiting'),
        active: t('Round in progress'),
        voting: t('Voting'),
        completed: t('Round over'),
    })[status];
</script>

<template>
    <Head :title="t('Spy')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div
            v-if="pendingInvitations.length > 0 || page.props.errors.invitation"
            id="pending-invitations"
            class="rounded-xl border border-primary/60 p-4"
        >
            <h2 class="mb-2 font-semibold">{{ t('Pending Invitations') }}</h2>
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
                    class="flex items-center justify-between gap-2"
                >
                    <span>{{
                        t(':game — invited by :codename', {
                            game: invitation.game_title,
                            codename: invitation.from_codename,
                        })
                    }}</span>
                    <span class="flex gap-2">
                        <Link
                            :href="`/invitations/${invitation.id}/accept`"
                            method="post"
                            as="button"
                            class="text-sm text-primary underline underline-offset-4"
                        >
                            {{ t('Accept') }}
                        </Link>
                        <Link
                            :href="`/invitations/${invitation.id}/decline`"
                            method="post"
                            as="button"
                            class="text-sm text-muted-foreground underline underline-offset-4"
                        >
                            {{ t('Decline') }}
                        </Link>
                    </span>
                </li>
            </ul>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <CreateGameForm />
            <JoinGameForm />
        </div>

        <div
            id="games-list"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">{{ t('Your Operations') }}</h2>
            <p v-if="games.length === 0" class="text-sm text-muted-foreground">
                {{
                    t(
                        'No operations yet. Create one above or join with an invite code.',
                    )
                }}
            </p>
            <ul class="divide-y">
                <li
                    v-for="game in games"
                    :key="game.id"
                    class="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                    <Link
                        :href="`/games/${game.code}`"
                        class="font-medium hover:underline"
                        >{{ game.title }}
                        <span class="font-mono text-sm text-muted-foreground"
                            >({{ game.code }})</span
                        ></Link
                    >
                    <span
                        class="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <span>{{
                            t(':count / :max operatives', {
                                count: game.player_count,
                                max: game.max_players,
                            })
                        }}</span>
                        <span v-if="game.host_id === page.props.auth.user.id"
                            >· {{ t('Host') }}</span
                        >
                        <Badge variant="secondary">{{
                            statusLabel(game.status)
                        }}</Badge>
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>
