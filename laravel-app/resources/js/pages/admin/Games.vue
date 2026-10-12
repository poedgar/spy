<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Trash2 } from '@lucide/vue';
import { computed, reactive, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import FilterSelect from '@/components/admin/FilterSelect.vue';
import StatCards from '@/components/admin/StatCards.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmAction } from '@/composables/useConfirm';
import { useTrans } from '@/composables/useTrans';
import type { GameType } from '@/types/game';

interface AdminGame {
    id: number;
    code: string;
    title: string;
    type: GameType;
    status: 'recruiting' | 'active' | 'voting' | 'completed';
    host: { id: number; codename: string } | null;
    players: string[];
    players_count: number;
    max_players: number;
    rounds_count: number;
    abandoned: boolean;
    is_listed: boolean;
    requires_approval: boolean;
    created_at: string | null;
    updated_at: string | null;
}

const props = defineProps<{
    games: Paginated<AdminGame>;
    filters: {
        q: string;
        type: string | null;
        status: string | null;
        user: { id: number; codename: string } | null;
    };
    stats: {
        total: number;
        playing: number;
        recruiting: number;
        new_this_week: number;
        abandoned: number;
    };
    abandonedAfterHours: number;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Games', href: '/admin/games' }],
    },
});

const { t, locale } = useTrans();
const form = reactive({
    q: props.filters.q,
    type: props.filters.type ?? '',
    status: props.filters.status ?? '',
});
let timer: number | undefined;

function apply() {
    const query: Record<string, string | number> = {};

    if (form.q.trim()) {
        query.q = form.q.trim();
    }

    if (form.type) {
        query.type = form.type;
    }

    if (form.status) {
        query.status = form.status;
    }

    if (props.filters.user) {
        query.user = props.filters.user.id;
    }

    router.get('/admin/games', query, {
        only: ['games', 'filters'],
        preserveState: true,
        replace: true,
    });
}

watch(
    () => form.q,
    () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 300);
    },
);
watch(() => [form.type, form.status], apply);

const typeLabels = computed<Record<GameType, string>>(() => ({
    spy: t('Spy'),
    phrase: t('Phrase'),
    song: t('Sing It Out'),
    finish: t('Finish the Phrase'),
}));

const statusLabels = computed<Record<AdminGame['status'], string>>(() => ({
    recruiting: t('Recruiting'),
    active: t('Round in progress'),
    voting: t('Voting'),
    completed: t('Round over'),
}));

function date(iso: string | null): string {
    return iso
        ? new Date(iso).toLocaleString(
              locale.value === 'uk' ? 'uk-UA' : 'en-GB',
              {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              },
          )
        : '—';
}

async function removeGame(game: AdminGame) {
    if (
        await confirmAction(
            t('Remove ":title" for good?', { title: game.title }),
        )
    ) {
        router.delete(`/admin/games/${game.code}`, { preserveScroll: true });
    }
}

async function removeAllAbandoned() {
    if (
        await confirmAction(
            t('Remove all :count abandoned games for good?', {
                count: props.stats.abandoned,
            }),
        )
    ) {
        router.delete('/admin/games/abandoned', { preserveScroll: true });
    }
}
</script>

<template>
    <Head :title="t('Games')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <StatCards
            :items="[
                { label: t('All games'), value: stats.total },
                { label: t('Being played'), value: stats.playing },
                { label: t('Recruiting'), value: stats.recruiting },
                { label: t('New this week'), value: stats.new_this_week },
                { label: t('Abandoned'), value: stats.abandoned },
            ]"
        />

        <p v-if="filters.user" id="admin-games-user" class="text-sm">
            {{ t('Games of :player', { player: filters.user.codename }) }} ·
            <Link
                href="/admin/games"
                class="text-primary underline underline-offset-4"
                >{{ t('Show all') }}</Link
            >
        </p>

        <div class="flex flex-wrap gap-2">
            <Input
                id="input-admin-game-search"
                v-model="form.q"
                type="search"
                class="min-w-48 flex-1"
                :placeholder="t('Search by title or invite code')"
            />
            <FilterSelect id="select-admin-game-type" v-model="form.type">
                <option value="">{{ t('All types') }}</option>
                <option value="spy">{{ t('Spy') }}</option>
                <option value="phrase">{{ t('Phrase') }}</option>
                <option value="song">{{ t('Sing It Out') }}</option>
                <option value="finish">{{ t('Finish the Phrase') }}</option>
            </FilterSelect>
            <FilterSelect id="select-admin-game-status" v-model="form.status">
                <option value="">{{ t('Any status') }}</option>
                <option
                    v-for="(label, value) in statusLabels"
                    :key="value"
                    :value="value"
                >
                    {{ label }}
                </option>
                <option value="abandoned">{{ t('Abandoned') }}</option>
            </FilterSelect>
        </div>

        <div
            v-if="stats.abandoned > 0"
            id="admin-abandoned"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-sidebar-border/70 p-3 text-sm dark:border-sidebar-border"
        >
            <span class="text-muted-foreground">
                {{
                    t(
                        'Abandoned: still recruiting :hours hours after creation, never started.',
                        { hours: abandonedAfterHours },
                    )
                }}
            </span>
            <Button
                id="btn-remove-abandoned"
                variant="destructive"
                size="sm"
                @click="removeAllAbandoned"
            >
                <Trash2 />
                {{
                    t('Remove all abandoned (:count)', {
                        count: stats.abandoned,
                    })
                }}
            </Button>
        </div>

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-games" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">{{ t('Game') }}</th>
                        <th class="px-3 py-2 font-medium">{{ t('Status') }}</th>
                        <th class="px-3 py-2 font-medium">{{ t('Host') }}</th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Players') }}
                        </th>
                        <th class="px-3 py-2 text-right font-medium">
                            {{ t('Rounds') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Created') }}
                        </th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Last activity') }}
                        </th>
                        <th class="px-3 py-2">
                            <span class="sr-only">{{ t('Actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="games.data.length === 0">
                        <td
                            colspan="8"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{ t('No games match.') }}
                        </td>
                    </tr>
                    <tr
                        v-for="game in games.data"
                        :key="game.id"
                        :data-game-code="game.code"
                        class="border-t border-sidebar-border/70 align-top dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">
                            <div class="font-medium">{{ game.title }}</div>
                            <div
                                class="flex flex-wrap items-center gap-1 text-muted-foreground"
                            >
                                <span class="font-mono">{{ game.code }}</span>
                                <Badge variant="outline">{{
                                    typeLabels[game.type]
                                }}</Badge>
                                <Badge
                                    v-if="game.is_listed"
                                    variant="outline"
                                    >{{ t('Listed') }}</Badge
                                >
                                <Badge
                                    v-if="game.requires_approval"
                                    variant="outline"
                                    >{{ t('Approval') }}</Badge
                                >
                            </div>
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            <Badge
                                :variant="
                                    game.status === 'recruiting'
                                        ? 'outline'
                                        : 'secondary'
                                "
                            >
                                {{ statusLabels[game.status] }}
                            </Badge>
                            <Badge
                                v-if="game.abandoned"
                                variant="destructive"
                                class="ml-1"
                                >{{ t('Abandoned') }}</Badge
                            >
                        </td>
                        <td class="px-3 py-2">
                            {{ game.host?.codename ?? '—' }}
                        </td>
                        <td class="px-3 py-2">
                            <div class="tabular-nums">
                                {{ game.players_count }} /
                                {{ game.max_players }}
                            </div>
                            <div class="text-muted-foreground">
                                {{ game.players.join(', ') }}
                            </div>
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums">
                            {{ game.rounds_count }}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            {{ date(game.created_at) }}
                        </td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            {{ date(game.updated_at) }}
                        </td>
                        <td class="px-3 py-2 text-right">
                            <Button
                                v-if="game.abandoned"
                                variant="ghost"
                                size="icon-sm"
                                class="text-red-600"
                                data-action="remove-game"
                                :title="t('Remove')"
                                :aria-label="t('Remove')"
                                @click="removeGame(game)"
                            >
                                <Trash2 />
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AdminPagination :page="games" />
    </div>
</template>
