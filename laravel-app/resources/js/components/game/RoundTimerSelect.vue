<script setup lang="ts">
import { useTrans } from '@/composables/useTrans';

/** Seconds per round; 0 means no timer. Mirrors Game::ROUND_TIMER_CHOICES. */
const choices = [0, 180, 300, 480, 600];

const model = defineModel<number>({ required: true });
const { t } = useTrans();
</script>

<template>
    <label class="block text-sm">
        <span class="mb-1 block font-medium">{{ t('Round timer') }}</span>
        <select
            id="input-round-seconds"
            v-model.number="model"
            class="w-full rounded border bg-background px-2 py-1"
        >
            <option v-for="seconds in choices" :key="seconds" :value="seconds">
                {{
                    seconds === 0
                        ? t('No timer')
                        : t(':minutes minutes', { minutes: seconds / 60 })
                }}
            </option>
        </select>
    </label>
</template>
