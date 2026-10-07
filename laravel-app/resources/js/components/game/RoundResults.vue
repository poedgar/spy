<script setup lang="ts">
import { Trophy } from '@lucide/vue';
import { computed } from 'vue';
import { useTrans } from '@/composables/useTrans';
import type { Game, Round, RoundResult } from '@/types/game';

const props = defineProps<{
    game: Game;
    round: Round;
    result: RoundResult;
}>();

const { t, pick } = useTrans();

// Codenames come from a small pool and can repeat, so the name tells
// operatives apart.
const codename = (userId: number | null) => {
    const user = props.game.players.find(
        (player) => player.user.id === userId,
    )?.user;

    return user ? `${user.codename} (${user.name})` : t('a departed operative');
};

const spies = computed(() =>
    props.result.spy_user_ids.map((id) => codename(id)).join(', '),
);

const summary = computed(() => {
    const result = props.result;

    if (result.ending === 'spy_guess') {
        return result.winning_team === 'spies'
            ? t(':spy named the location. The spies win!', {
                  spy: codename(result.guessed_by_user_id),
              })
            : t(':spy guessed :place and was wrong. The loyalists win!', {
                  spy: codename(result.guessed_by_user_id),
                  place: pick(result.guessed_location),
              });
    }

    if (result.accused_user_id === null) {
        return t('The table could not agree on a suspect. The spies win!');
    }

    return result.winning_team === 'loyalists'
        ? t(':player was a spy. The loyalists win!', {
              player: codename(result.accused_user_id),
          })
        : t(':player was innocent. The spies win!', {
              player: codename(result.accused_user_id),
          });
});
</script>

<template>
    <div
        id="round-results"
        class="rounded-xl border p-4"
        :class="
            result.winning_team === 'spies'
                ? 'border-red-500/60 bg-red-500/5'
                : 'border-emerald-500/60 bg-emerald-500/5'
        "
    >
        <h2 class="flex items-center gap-2 text-lg font-bold">
            <Trophy class="size-5" />
            {{
                result.winning_team === 'spies'
                    ? t('Spies win round :number', { number: round.number })
                    : t('Loyalists win round :number', { number: round.number })
            }}
        </h2>
        <p id="round-summary" class="mt-1">{{ summary }}</p>

        <dl class="mt-3 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt class="text-muted-foreground">{{ t('Location') }}</dt>
            <dd class="font-semibold">{{ pick(round.location) }}</dd>
            <dt class="text-muted-foreground">
                {{ result.spy_user_ids.length === 1 ? t('Spy') : t('Spies') }}
            </dt>
            <dd class="font-semibold text-red-600 dark:text-red-400">
                {{ spies }}
            </dd>
        </dl>

        <div v-if="result.votes.length > 0" class="mt-3">
            <h3 class="text-sm font-semibold">{{ t('Votes') }}</h3>
            <ul class="mt-1 space-y-0.5 text-sm">
                <li v-for="vote in result.votes" :key="vote.voter_id">
                    {{ codename(vote.voter_id) }} →
                    {{ codename(vote.suspect_id) }}
                </li>
            </ul>
        </div>
    </div>
</template>
