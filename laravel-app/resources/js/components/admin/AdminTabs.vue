<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { useTrans } from '@/composables/useTrans';

const { t } = useTrans();
const page = usePage();
const tabs = [
    { label: 'Users', href: '/admin/users' },
    { label: 'Games', href: '/admin/games' },
];
</script>

<template>
    <nav id="admin-tabs" class="flex gap-1 border-b border-sidebar-border/70">
        <Link
            v-for="tab in tabs"
            :key="tab.href"
            :href="tab.href"
            class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
            :class="
                page.url.startsWith(tab.href)
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            "
        >
            {{ t(tab.label) }}
        </Link>
    </nav>
</template>
