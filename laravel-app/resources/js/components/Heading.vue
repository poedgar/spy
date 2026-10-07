<script setup lang="ts">
import { useTrans } from '@/composables/useTrans';

type Props = {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
};

withDefaults(defineProps<Props>(), {
    variant: 'default',
});

const { t } = useTrans();
</script>

<template>
    <header :class="variant === 'small' ? '' : 'mb-8 space-y-0.5'">
        <h2
            :class="
                variant === 'small'
                    ? 'mb-0.5 text-base font-medium'
                    : 'text-xl font-semibold tracking-tight'
            "
        >
            {{ t(title) }}
        </h2>
        <p v-if="description" class="text-sm text-muted-foreground">
            {{ t(description) }}
        </p>
    </header>
</template>
