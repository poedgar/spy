<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { useTrans } from '@/composables/useTrans';

export interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
}

defineProps<{ page: Paginated<unknown> }>();

const { t } = useTrans();

/** Laravel's labels are HTML entities ("&laquo; Previous"). */
function label(text: string): string {
    if (text.includes('Previous')) {
        return '‹';
    }

    if (text.includes('Next')) {
        return '›';
    }

    return text;
}
</script>

<template>
    <div
        v-if="page.total > 0"
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
    >
        <span class="text-muted-foreground">
            {{
                t(':from–:to of :total', {
                    from: page.from ?? 0,
                    to: page.to ?? 0,
                    total: page.total,
                })
            }}
        </span>
        <nav class="flex flex-wrap gap-1">
            <template v-for="(link, index) in page.links" :key="index">
                <Link
                    v-if="link.url"
                    :href="link.url"
                    preserve-scroll
                    class="rounded-md border px-3 py-1"
                    :class="
                        link.active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:border-primary'
                    "
                    >{{ label(link.label) }}</Link
                >
                <span
                    v-else
                    class="rounded-md border px-3 py-1 text-muted-foreground opacity-50"
                    >{{ label(link.label) }}</span
                >
            </template>
        </nav>
    </div>
</template>
