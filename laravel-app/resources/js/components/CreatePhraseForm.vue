<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { useTrans, type Locale } from '@/composables/useTrans';

const { t, locale } = useTrans();

const MAX_PLAYERS = 10;

const form = useForm({
    title: '',
    // Phrases come from a pool in this language, independent of the UI's.
    phrase_language: locale.value as Locale,
    max_players: 6,
});

function submit() {
    form.post('/games/phrase');
}
</script>

<template>
    <form
        id="create-phrase-form"
        class="space-y-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="font-semibold">{{ t('New Phrase game') }}</h2>

        <div>
            <input
                id="input-phrase-title"
                v-model="form.title"
                type="text"
                :placeholder="t('Game title')"
                class="w-full rounded border px-2 py-1"
            />
            <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">
                {{ form.errors.title }}
            </p>
        </div>

        <fieldset>
            <legend class="mb-1 text-sm font-medium">
                {{ t('Phrase language') }}
            </legend>
            <div class="grid grid-cols-2 gap-2">
                <label
                    v-for="option in [
                        { value: 'en', label: 'English' },
                        { value: 'uk', label: 'Українська' },
                    ]"
                    :key="option.value"
                    class="cursor-pointer rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    :data-phrase-language="option.value"
                >
                    <input
                        v-model="form.phrase_language"
                        type="radio"
                        name="phrase_language"
                        :value="option.value"
                        class="sr-only"
                    />
                    {{ option.label }}
                </label>
            </div>
        </fieldset>

        <div>
            <label
                for="input-phrase-max-players"
                class="mb-1 block text-sm font-medium"
                >{{ t('Players') }}: {{ form.max_players }}</label
            >
            <input
                id="input-phrase-max-players"
                v-model.number="form.max_players"
                type="number"
                min="3"
                :max="MAX_PLAYERS"
                class="w-full rounded border px-2 py-1"
            />
            <p v-if="form.errors.max_players" class="mt-1 text-sm text-red-600">
                {{ form.errors.max_players }}
            </p>
        </div>

        <button
            id="btn-create-phrase"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            {{ t('Create') }}
        </button>
    </form>
</template>
