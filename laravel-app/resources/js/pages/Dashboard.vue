<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { dashboard } from '@/routes';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Games',
                href: dashboard(),
            },
        ],
    },
});
</script>

<template>
    <Head title="Choose a Game" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">Choose a Game</h1>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
                id="tile-spy"
                href="/games/spy"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">Spy</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    A social-deduction party game. Find the mole before time
                    runs out.
                </p>
            </Link>

            <div
                class="tile-coming-soon rounded-xl border border-dashed border-sidebar-border/70 p-4 opacity-50 dark:border-sidebar-border"
                aria-disabled="true"
            >
                <h2 class="font-semibold">Coming Soon</h2>
            </div>

            <div
                class="tile-coming-soon rounded-xl border border-dashed border-sidebar-border/70 p-4 opacity-50 dark:border-sidebar-border"
                aria-disabled="true"
            >
                <h2 class="font-semibold">Coming Soon</h2>
            </div>
        </div>
    </div>
</template>
