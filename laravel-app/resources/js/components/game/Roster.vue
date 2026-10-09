<script setup lang="ts">
import { computed } from 'vue';
import PlayerActions from '@/components/game/PlayerActions.vue';
import { Button } from '@/components/ui/button';
import { useLobby } from '@/composables/useLobby';
import type { Game, Player } from '@/types/game';

/**
 * Players by score, with readiness, the host's per-player actions between
 * rounds, and a `badge` slot for game-specific markers (voted, asking).
 */
const props = defineProps<{ game: Game; inRound: boolean }>();

defineSlots<{ badge?(props: { player: Player }): unknown }>();

const { t, myId, isHost, me, busy, act } = useLobby(() => props.game);
const scoreboard = computed(() =>
    [...props.game.players].sort((a, b) => b.score - a.score),
);
</script>

<template>
    <div
        id="operatives-roster"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="font-semibold">{{ t('Players') }}</h2>
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
                    <slot name="badge" :player="player" />
                </span>
                <span class="flex items-center gap-2">
                    <PlayerActions
                        v-if="isHost && !inRound && player.user.id !== myId"
                        :code="game.code"
                        :player="player.user"
                    />
                    <span class="text-xs text-muted-foreground">{{
                        t(':score pts', { score: player.score })
                    }}</span>
                </span>
            </li>
        </ul>
    </div>
</template>
