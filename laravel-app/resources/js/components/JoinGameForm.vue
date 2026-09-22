<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';

const form = useForm({
    code: '',
});

function submit() {
    form.post(`/games/${form.code}/join`);
}
</script>

<template>
    <form id="join-game-form" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border" @submit.prevent="submit">
        <h2 class="mb-2 font-semibold">Join Operation</h2>
        <input
            id="input-join-code"
            v-model="form.code"
            type="text"
            placeholder="SPY-XXXX"
            class="mb-2 w-full rounded border px-2 py-1 font-mono uppercase"
        />
        <p v-if="form.errors.game" class="mb-2 text-sm text-red-600">{{ form.errors.game }}</p>
        <button id="btn-join-game" type="submit" :disabled="form.processing" class="rounded bg-primary px-3 py-1.5 text-primary-foreground">
            Join
        </button>
    </form>
</template>
