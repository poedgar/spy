<script setup lang="ts">
defineProps<{ items: { label: string; value: number }[] }>();
</script>

<template>
    <div id="admin-stats" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
            v-for="item in items"
            :key="item.label"
            class="rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border"
        >
            <div class="text-sm text-muted-foreground">{{ item.label }}</div>
            <div class="text-2xl font-semibold">{{ item.value }}</div>
        </div>
    </div>
</template>
