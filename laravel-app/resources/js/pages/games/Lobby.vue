<script setup lang="ts">
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import {
    Check,
    Copy,
    LogOut,
    Play,
    RotateCcw,
    UserPlus,
    Vote,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import LocationGuideDialog from '@/components/game/LocationGuideDialog.vue';
import RoleCard from '@/components/game/RoleCard.vue';
import RoundResults from '@/components/game/RoundResults.vue';
import VotingPanel from '@/components/game/VotingPanel.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameChannel } from '@/composables/useGameChannel';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { Categories, Game, Place } from '@/types/game';

const props = defineProps<{
    game: Game;
    locations: Place[];
    categories: Categories;
}>();

const { t } = useTrans();
const { modes, tiers } = useGameLabels();
const page = usePage<{
    auth: { user: { id: number } };
    errors: Record<string, string>;
}>();

const myId = computed(() => page.props.auth.user.id);
const isHost = computed(() => myId.value === props.game.host.id);
const me = computed(() =>
    props.game.players.find((player) => player.user.id === myId.value),
);
const round = computed(() => props.game.round);
const inRound = computed(
    () => props.game.status === 'active' || props.game.status === 'voting',
);
const canStart = computed(
    () => props.game.players.length >= props.game.min_players,
);
const scoreboard = computed(() =>
    [...props.game.players].sort((a, b) => b.score - a.score),
);

const statusLabels = computed<Record<Game['status'], string>>(() => ({
    recruiting: t('Recruiting'),
    active: t('Round in progress'),
    voting: t('Voting'),
    completed: t('Round over'),
}));

const busy = ref(false);
const copied = ref(false);

useGameChannel(props.game.id);

function act(action: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
        return;
    }

    busy.value = true;
    router.post(
        `/games/${props.game.code}/${action}`,
        {},
        { preserveScroll: true, onFinish: () => (busy.value = false) },
    );
}

async function copyInvite() {
    const link = `${window.location.origin}/games/spy?join=${props.game.code}`;

    try {
        await navigator.clipboard.writeText(link);
    } catch {
        window.prompt(t('Copy this invite link:'), link);
    }

    copied.value = true;
    window.setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div
            id="lobby-header"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-muted-foreground">
                    {{ t('Invite code:') }}
                    <span id="game-invite-code" class="font-mono font-bold">{{
                        game.code
                    }}</span>
                    <Button
                        id="btn-copy-invite"
                        variant="ghost"
                        size="icon-sm"
                        :title="t('Copy invite link')"
                        @click="copyInvite"
                    >
                        <component :is="copied ? Check : Copy" />
                    </Button>
                </p>
                <Badge id="game-status" variant="secondary">{{
                    statusLabels[game.status]
                }}</Badge>
            </div>
            <h1 class="text-xl font-bold">{{ game.title }}</h1>
            <p class="mt-1 text-sm">{{ game.mission_briefing }}</p>
            <p class="mt-2 text-sm text-muted-foreground">
                {{
                    t(':count / :max operatives', {
                        count: game.players.length,
                        max: game.max_players,
                    })
                }}
                ·
                {{
                    game.spy_count === 1
                        ? t('1 spy')
                        : t(':count spies', { count: game.spy_count })
                }}
                · {{ modes[game.game_mode].label }} ·
                {{ tiers[game.age_tier].label }}
            </p>

            <p v-if="page.props.errors.game" class="mt-2 text-sm text-red-600">
                {{ page.props.errors.game }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
                <template v-if="isHost">
                    <Button
                        v-if="!inRound"
                        id="btn-start-round"
                        :disabled="busy || !canStart"
                        @click="act('start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Start next round')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-if="game.status === 'active'"
                        id="btn-start-voting"
                        :disabled="busy"
                        @click="act('voting')"
                    >
                        <Vote />
                        {{ t('Call a vote') }}
                    </Button>
                    <Button
                        v-if="game.status !== 'recruiting'"
                        id="btn-reset-game"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'reset',
                                inRound
                                    ? t(
                                          'End this round without scoring and reopen recruiting?',
                                      )
                                    : undefined,
                            )
                        "
                    >
                        <RotateCcw />
                        {{ t('Back to recruiting') }}
                    </Button>
                    <Link
                        v-if="game.status === 'recruiting'"
                        id="btn-invite-players"
                        :href="`/games/${game.code}/invite`"
                        class="inline-flex items-center gap-1 self-center text-sm text-primary underline underline-offset-4"
                    >
                        <UserPlus class="size-4" />
                        {{ t('Invite Players') }}
                    </Link>
                </template>
                <Button
                    v-else-if="!inRound"
                    id="btn-leave-game"
                    variant="outline"
                    :disabled="busy"
                    @click="act('leave', t('Leave this operation?'))"
                >
                    <LogOut />
                    {{ t('Leave') }}
                </Button>
                <LocationGuideDialog
                    :locations="locations"
                    :categories="categories"
                />
            </div>
            <p
                v-if="isHost && !inRound && !canStart"
                class="mt-2 text-sm text-muted-foreground"
            >
                {{
                    t('At least :count operatives are required to start.', {
                        count: game.min_players,
                    })
                }}
            </p>
            <p
                v-else-if="!isHost && game.status === 'recruiting'"
                class="mt-2 text-sm text-muted-foreground"
            >
                {{ t('Waiting for the host to start the game…') }}
            </p>
        </div>

        <RoleCard
            v-if="inRound && round"
            :key="round.number"
            :game="game"
            :round="round"
            :locations="locations"
            :categories="categories"
        />

        <VotingPanel
            v-if="game.status === 'voting' && round"
            :game="game"
            :round="round"
            :is-host="isHost"
        />

        <RoundResults
            v-if="game.status === 'completed' && round?.result"
            :game="game"
            :round="round"
            :result="round.result"
        />

        <div
            id="operatives-roster"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <div class="mb-2 flex items-center justify-between gap-2">
                <h2 class="font-semibold">{{ t('Roster') }}</h2>
                <Button
                    v-if="me && !inRound"
                    id="btn-toggle-ready"
                    variant="outline"
                    size="sm"
                    :disabled="busy"
                    @click="act('ready')"
                >
                    {{
                        me.status === 'ready'
                            ? t('Mark me not ready')
                            : t('Mark me ready')
                    }}
                </Button>
            </div>
            <ul id="roster-list" class="space-y-1">
                <li
                    v-for="player in scoreboard"
                    :key="player.id"
                    class="flex items-center justify-between gap-2"
                >
                    <span class="flex items-center gap-2">
                        <span
                            :class="[
                                'inline-block h-2 w-2 rounded-full',
                                player.status === 'ready'
                                    ? 'bg-green-500'
                                    : 'bg-muted-foreground/40',
                            ]"
                            :title="
                                player.status === 'ready'
                                    ? t('Ready')
                                    : t('Not ready')
                            "
                        />
                        {{ player.user.codename }}
                        <span class="text-sm text-muted-foreground">{{
                            player.user.name
                        }}</span>
                        <span
                            v-if="player.is_host"
                            class="text-xs text-muted-foreground"
                            >({{ t('Host') }})</span
                        >
                        <span
                            v-if="player.user.id === myId"
                            class="text-xs text-muted-foreground"
                            >({{ t('you') }})</span
                        >
                        <Badge
                            v-if="
                                game.status === 'voting' &&
                                round?.voted_user_ids.includes(player.user.id)
                            "
                            variant="outline"
                            >{{ t('voted') }}</Badge
                        >
                    </span>
                    <span class="text-xs text-muted-foreground">{{
                        t(':score pts', { score: player.score })
                    }}</span>
                </li>
            </ul>
        </div>
    </div>
</template>
