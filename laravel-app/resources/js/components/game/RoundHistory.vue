<script setup lang="ts">
import { History } from '@lucide/vue';
import { useLobby } from '@/composables/useLobby';
import { useTrans } from '@/composables/useTrans';
import type { Game } from '@/types/game';

const props = defineProps<{ game: Game }>();

const { t, pick } = useTrans();
const { playerName } = useLobby(() => props.game);

function spyOutcome(entry: NonNullable<Game['history']>[number]): string {
    if (entry.ending === 'abandoned') {
        return t('Abandoned');
    }

    return entry.winning_team === 'spies' ? t('Spies won') : t('Loyalists won');
}

function phraseOutcome(entry: NonNullable<Game['history']>[number]): string {
    if (entry.ending === 'guessed') {
        return t(':player guessed it', {
            player: playerName(entry.winner_user_id ?? null),
        });
    }

    return entry.ending === 'abandoned'
        ? t('Abandoned')
        : t('Nobody guessed it');
}
</script>

<template>
    <details
        v-if="game.history?.length"
        id="round-history"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <summary class="flex cursor-pointer items-center gap-2 font-semibold">
            <History class="size-4" />
            {{ t('Previous rounds') }} ({{ game.history.length }})
        </summary>
        <ol class="mt-2 space-y-1 text-sm">
            <li v-for="entry in game.history" :key="entry.number">
                <span class="font-medium">{{
                    t('Round :number', { number: entry.number })
                }}</span>
                ·
                <template v-if="game.game_type === 'phrase'">
                    “{{ entry.phrase }}” · {{ phraseOutcome(entry) }}
                </template>
                <template v-else>
                    {{ pick(entry.location) }} · {{ spyOutcome(entry) }} ·
                    {{ t('Spies') }}:
                    {{
                        (entry.spy_user_ids ?? [])
                            .map((id) => playerName(id))
                            .join(', ')
                    }}
                </template>
            </li>
        </ol>
    </details>
</template>
