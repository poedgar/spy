<script setup lang="ts">
import { useTrans } from '@/composables/useTrans';

defineProps<{ credit: string | null; sourceUrl: string | null }>();

const { t } = useTrans();
</script>

<template>
    <!-- The pictures' licences ask for credit wherever they're shown. -->
    <p v-if="credit" class="meme-credit text-xs text-muted-foreground">
        {{ t('Photo:') }}
        <a
            v-if="sourceUrl"
            :href="sourceUrl"
            target="_blank"
            rel="noopener"
            class="underline underline-offset-2"
            >{{ credit }}</a
        >
        <template v-else>{{ credit }}</template>
    </p>
</template>
