<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import GameNameInput from '@/components/GameNameInput.vue';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { EmotionLevel } from '@/types/game';

const { t } = useTrans();
const { emotionLevels } = useGameLabels();

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;

const form = useForm({
    title: '',
    emotion_level: 1 as EmotionLevel,
    // Tables start at the minimum; the host raises it for bigger groups.
    max_players: MIN_PLAYERS,
    requires_approval: false,
    is_listed: true,
});

function submit() {
    form.post('/games/emotion');
}
</script>

<template>
    <form
        id="create-emotion-form"
        class="space-y-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="font-semibold">{{ t('New Name the Emotion game') }}</h2>

        <div>
            <GameNameInput
                id="input-emotion-title"
                v-model="form.title"
                type="emotion"
                :placeholder="t('Game title')"
            />
            <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">
                {{ form.errors.title }}
            </p>
        </div>

        <fieldset>
            <legend class="mb-1 text-sm font-medium">
                {{ t('Difficulty') }}
            </legend>
            <div class="grid gap-2 sm:grid-cols-3">
                <label
                    v-for="(level, value) in emotionLevels"
                    :key="value"
                    class="cursor-pointer rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    :data-emotion-level="value"
                >
                    <input
                        v-model.number="form.emotion_level"
                        type="radio"
                        name="emotion_level"
                        :value="Number(value)"
                        class="sr-only"
                    />
                    <span class="font-medium">{{ level.label }}</span>
                    <span class="block text-xs text-muted-foreground">{{
                        level.description
                    }}</span>
                </label>
            </div>
            <p
                v-if="form.errors.emotion_level"
                class="mt-1 text-sm text-red-600"
            >
                {{ form.errors.emotion_level }}
            </p>
        </fieldset>

        <div>
            <label
                for="input-emotion-max-players"
                class="mb-1 block text-sm font-medium"
                >{{ t('Players') }}: {{ form.max_players }}</label
            >
            <input
                id="input-emotion-max-players"
                v-model.number="form.max_players"
                type="number"
                :min="MIN_PLAYERS"
                :max="MAX_PLAYERS"
                class="w-full rounded border px-2 py-1"
            />
            <p v-if="form.errors.max_players" class="mt-1 text-sm text-red-600">
                {{ form.errors.max_players }}
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

        <label class="flex items-center gap-2 text-sm">
            <input
                id="input-is-listed"
                v-model="form.is_listed"
                type="checkbox"
            />
            {{ t('List in open games so anyone can ask to join') }}
        </label>

        <button
            id="btn-create-emotion"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            {{ t('Create') }}
        </button>
    </form>
</template>
