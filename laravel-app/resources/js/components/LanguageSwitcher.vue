<script setup lang="ts">
import { Languages } from '@lucide/vue';
import { useTrans, type Locale } from '@/composables/useTrans';

const { locale, setLocale } = useTrans();

const options: { value: Locale; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'uk', label: 'УКР' },
];
</script>

<template>
    <div
        id="language-switcher"
        class="inline-flex items-center gap-1 rounded-md border p-0.5 text-xs"
        role="group"
        aria-label="Language / Мова"
    >
        <Languages class="mx-1 size-3.5 text-muted-foreground" />
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="rounded px-2 py-1"
            :class="
                locale === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
            "
            :aria-pressed="locale === option.value"
            :data-locale="option.value"
            @click="locale !== option.value && setLocale(option.value)"
        >
            {{ option.label }}
        </button>
    </div>
</template>
