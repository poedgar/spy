<script setup lang="ts">
import PlayerLimitsInput from '@/components/PlayerLimitsInput.vue';
import { playerLimits } from '@/lib/playerLimits';
import { useForm } from '@inertiajs/vue3';
import GameNameInput from '@/components/GameNameInput.vue';
import { useTrans, type Locale } from '@/composables/useTrans';

/** The written games create games the same way; Meme It needs no language. */
const props = withDefaults(
    defineProps<{ type?: 'finish' | 'meaning' | 'meme' }>(),
    { type: 'finish' },
);

const { t, locale } = useTrans();

const limits = playerLimits(props.type);

const form = useForm({
    title: '',
    // Beginnings come from a pool in this language, independent of the UI's.
    phrase_language: locale.value as Locale,
    min_players: limits.min,
    max_players: limits.defaultMax,
    requires_approval: false,
    is_listed: true,
});

function submit() {
    form.transform((data) =>
        props.type === 'meme' ? { ...data, phrase_language: undefined } : data,
    ).post(`/games/${props.type}`);
}
</script>

<template>
    <form
        :id="`create-${type}-form`"
        class="space-y-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="font-semibold">
            {{
                type === 'meme'
                    ? t('New Meme It game')
                    : type === 'meaning'
                      ? t('New Interpret the Phrase game')
                      : t('New Finish the Phrase game')
            }}
        </h2>

        <div>
            <GameNameInput
                :id="`input-${type}-title`"
                v-model="form.title"
                :type="type"
                :placeholder="t('Game title')"
            />
            <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">
                {{ form.errors.title }}
            </p>
        </div>

        <fieldset v-if="type !== 'meme'">
            <legend class="mb-1 text-sm font-medium">
                {{ t('Language of the phrases') }}
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

        <PlayerLimitsInput
            v-model:min="form.min_players"
            v-model:max="form.max_players"
            :id-prefix="`input-${type}`"
            :min-allowed="limits.min"
            :max-allowed="limits.max"
            :min-error="form.errors.min_players"
            :max-error="form.errors.max_players"
        />

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
            :id="`btn-create-${type}`"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            {{ t('Create') }}
        </button>
    </form>
</template>
