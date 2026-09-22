<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';

const form = useForm({
    title: '',
    game_mode: 'mole',
    max_players: 6,
    mission_briefing: 'A rogue operative has intercepted intelligence files.',
});

function submit() {
    form.post('/games');
}
</script>

<template>
    <form
        id="create-game-form"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        @submit.prevent="submit"
    >
        <h2 class="mb-2 font-semibold">Create Operation</h2>
        <input
            id="input-game-title"
            v-model="form.title"
            type="text"
            placeholder="Operation title"
            class="mb-2 w-full rounded border px-2 py-1"
        />
        <p v-if="form.errors.title" class="mb-2 text-sm text-red-600">
            {{ form.errors.title }}
        </p>

        <input
            id="input-max-players"
            v-model.number="form.max_players"
            type="number"
            min="3"
            max="12"
            class="mb-2 w-full rounded border px-2 py-1"
        />
        <p v-if="form.errors.max_players" class="mb-2 text-sm text-red-600">
            {{ form.errors.max_players }}
        </p>

        <textarea
            id="input-mission-briefing"
            v-model="form.mission_briefing"
            class="mb-2 w-full rounded border px-2 py-1"
        ></textarea>
        <p
            v-if="form.errors.mission_briefing"
            class="mb-2 text-sm text-red-600"
        >
            {{ form.errors.mission_briefing }}
        </p>

        <button
            id="btn-create-game"
            type="submit"
            :disabled="form.processing"
            class="rounded bg-primary px-3 py-1.5 text-primary-foreground"
        >
            Create
        </button>
    </form>
</template>
