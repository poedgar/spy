<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
import { dashboard } from '@/routes';

interface GameRow {
    id: number;
    code: string;
    title: string;
    status: string;
}

defineProps<{
    games: GameRow[];
}>();

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
        ],
    },
});
</script>

<template>
    <Head title="Dashboard" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div class="grid gap-4 md:grid-cols-2">
            <CreateGameForm />
            <JoinGameForm />
        </div>

        <div
            id="games-list"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">Your Operations</h2>
            <ul class="space-y-1">
                <li v-for="game in games" :key="game.id">
                    <Link :href="`/games/${game.code}`" class="font-mono"
                        >{{ game.title }} ({{ game.code }})</Link
                    >
                </li>
            </ul>
        </div>
    </div>
</template>
