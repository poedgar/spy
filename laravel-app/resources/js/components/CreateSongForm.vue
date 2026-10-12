<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import GameNameInput from '@/components/GameNameInput.vue';
import { useTrans } from '@/composables/useTrans';

const { t } = useTrans();

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;

const form = useForm({
    title: '',
    // Tables start at the minimum; the host raises it for bigger groups.
    max_players: MIN_PLAYERS,
    requires_approval: false,
    is_listed: true,
});

function submit() {
    form.post('/games/song');
}
</script>

<template>
    <form
        id="create-song-form"
        class="space-y-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="font-semibold">{{ t('New Sing It Out game') }}</h2>

        <div>
            <GameNameInput
                id="input-song-title"
                v-model="form.title"
                type="song"
                :placeholder="t('Game title')"
            />
            <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">
                {{ form.errors.title }}
            </p>
        </div>

        <div>
            <label
                for="input-song-max-players"
                class="mb-1 block text-sm font-medium"
                >{{ t('Players') }}: {{ form.max_players }}</label
            >
            <input
                id="input-song-max-players"
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
            id="btn-create-song"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            {{ t('Create') }}
        </button>
    </form>
</template>
