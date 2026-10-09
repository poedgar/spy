<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import RoundTimerSelect from '@/components/game/RoundTimerSelect.vue';
import { computed, watch } from 'vue';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { AgeTier, GameMode } from '@/types/game';

const { t } = useTrans();
const { modes, tiers } = useGameLabels();

const MIN_PLAYERS = 3;

const form = useForm({
    title: '',
    game_mode: 'mole' as GameMode,
    age_tier: 'adults' as AgeTier,
    // Tables start at the minimum; the host raises it for bigger groups.
    max_players: MIN_PLAYERS,
    mission_briefing: t(
        'A rogue operative has intercepted intelligence files.',
    ),
    requires_approval: false,
    is_listed: true,
    round_seconds: 0,
});

/** Mirrors Game::spyCountFor on the server. */
const spiesAtCapacity = computed(() => {
    const players = form.max_players;

    if (players < 5) {
        return 1;
    }

    return players < 8 ? 2 : 1 + Math.floor((players - 2) / 3);
});

// Codebreaker is the race-the-clock mode: suggest a timer.
watch(
    () => form.game_mode,
    (mode) => {
        if (mode === 'codebreaker' && form.round_seconds === 0) {
            form.round_seconds = 480;
        }
    },
);

function submit() {
    form.post('/games');
}
</script>

<template>
    <form
        id="create-game-form"
        class="space-y-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="font-semibold">{{ t('Create Operation') }}</h2>

        <div>
            <input
                id="input-game-title"
                v-model="form.title"
                type="text"
                :placeholder="t('Operation title')"
                class="w-full rounded border px-2 py-1"
            />
            <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">
                {{ form.errors.title }}
            </p>
        </div>

        <fieldset>
            <legend class="mb-1 text-sm font-medium">
                {{ t('Game mode') }}
            </legend>
            <div class="grid gap-2 sm:grid-cols-3">
                <label
                    v-for="(mode, key) in modes"
                    :key="key"
                    class="cursor-pointer rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                    <input
                        v-model="form.game_mode"
                        type="radio"
                        name="game_mode"
                        :value="key"
                        class="sr-only"
                    />
                    <span class="block font-medium">{{ mode.label }}</span>
                    <span class="block text-xs text-muted-foreground">{{
                        mode.description
                    }}</span>
                </label>
            </div>
        </fieldset>

        <fieldset>
            <legend class="mb-1 text-sm font-medium">
                {{ t('Player age group') }}
            </legend>
            <div class="grid gap-2 sm:grid-cols-3">
                <label
                    v-for="(tier, key) in tiers"
                    :key="key"
                    class="cursor-pointer rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    :data-tier="key"
                >
                    <input
                        v-model="form.age_tier"
                        type="radio"
                        name="age_tier"
                        :value="key"
                        class="sr-only"
                    />
                    <span class="block font-medium">{{ tier.label }}</span>
                    <span class="block text-xs text-muted-foreground">{{
                        tier.description
                    }}</span>
                </label>
            </div>
        </fieldset>

        <div>
            <label
                for="input-max-players"
                class="mb-1 block text-sm font-medium"
            >
                {{ t('Operatives') }}: {{ form.max_players }} ·
                {{
                    spiesAtCapacity === 1
                        ? t('1 spy when full')
                        : t(':count spies when full', {
                              count: spiesAtCapacity,
                          })
                }}
            </label>
            <input
                id="input-max-players"
                v-model.number="form.max_players"
                type="number"
                :min="MIN_PLAYERS"
                max="12"
                class="w-full rounded border px-2 py-1"
            />
            <p v-if="form.errors.max_players" class="mt-1 text-sm text-red-600">
                {{ form.errors.max_players }}
            </p>
        </div>

        <div>
            <label
                for="input-mission-briefing"
                class="mb-1 block text-sm font-medium"
                >{{ t('Mission briefing') }}</label
            >
            <textarea
                id="input-mission-briefing"
                v-model="form.mission_briefing"
                class="w-full rounded border px-2 py-1"
            ></textarea>
            <p
                v-if="form.errors.mission_briefing"
                class="mt-1 text-sm text-red-600"
            >
                {{ form.errors.mission_briefing }}
            </p>
        </div>

        <label class="flex items-center gap-2 text-sm">
            <input
                id="input-requires-approval"
                v-model="form.requires_approval"
                type="checkbox"
            />
            {{ t('Approve new players before they join') }}
        </label>

        <RoundTimerSelect v-model="form.round_seconds" />

        <label class="flex items-center gap-2 text-sm">
            <input
                id="input-is-listed"
                v-model="form.is_listed"
                type="checkbox"
            />
            {{ t('List in open games so anyone can ask to join') }}
        </label>

        <button
            id="btn-create-game"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            {{ t('Create') }}
        </button>
    </form>
</template>
