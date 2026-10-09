<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { Check, Copy, LogOut, RotateCcw, Trash2, UserPlus } from '@lucide/vue';
import { ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLobby } from '@/composables/useLobby';
import type { Game } from '@/types/game';

/**
 * The top of either lobby: invite code, status, title and the controls
 * every game has (invite, back to recruiting, close, leave). Game-specific
 * details and buttons go in the `meta` and `actions` slots.
 */
const props = defineProps<{
    game: Game;
    /** Roles or words are dealt: nobody may leave or be removed. */
    inRound: boolean;
}>();

const { t, isHost, canStart, errors, busy, statusLabels, act } = useLobby(
    () => props.game,
);
const copied = ref(false);
const home = () => (props.game.game_type === 'phrase' ? 'phrase' : 'spy');

async function copyInvite() {
    const link = `${window.location.origin}/games/${home()}?join=${props.game.code}`;

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
        <slot name="meta" />

        <p v-if="errors.game" class="mt-2 text-sm text-red-600">
            {{ errors.game }}
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
            <slot name="actions" :busy="busy" :act="act" />
            <template v-if="isHost">
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
                v-if="!inRound"
                id="btn-leave-game"
                variant="outline"
                :disabled="busy"
                @click="
                    act(
                        'leave',
                        isHost
                            ? t(
                                  'Leave? Hosting passes to the next player, or the game closes if nobody is left.',
                              )
                            : t('Leave this game?'),
                    )
                "
            >
                <LogOut />
                {{ t('Leave') }}
            </Button>
            <Button
                v-if="isHost"
                id="btn-close-game"
                variant="ghost"
                class="text-red-600"
                :disabled="busy"
                @click="
                    act(
                        '',
                        t(
                            'Close this game for everyone? This cannot be undone.',
                        ),
                        'delete',
                        `/games/${game.code}`,
                    )
                "
            >
                <Trash2 />
                {{ t('Close game') }}
            </Button>
        </div>
        <p
            v-if="isHost && !inRound && !canStart"
            class="mt-2 text-sm text-muted-foreground"
        >
            {{
                t('At least :count players are required to start.', {
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
</template>
