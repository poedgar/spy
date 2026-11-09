<script setup lang="ts">
import { watch } from 'vue';
import { useTrans } from '@/composables/useTrans';

/**
 * The host's two player counts: how many a round needs to start, and how
 * many the table holds. Each pulls the other along so min never exceeds max.
 */
const props = withDefaults(
    defineProps<{
        idPrefix: string;
        minAllowed: number;
        maxAllowed: number;
        label?: string;
        minError?: string;
        maxError?: string;
    }>(),
    { label: undefined, minError: undefined, maxError: undefined },
);

const minPlayers = defineModel<number>('min', { required: true });
const maxPlayers = defineModel<number>('max', { required: true });

const { t } = useTrans();

watch(minPlayers, (value) => {
    if (Number.isFinite(value) && value > maxPlayers.value) {
        maxPlayers.value = Math.min(value, props.maxAllowed);
    }
});

watch(maxPlayers, (value) => {
    if (Number.isFinite(value) && value < minPlayers.value) {
        minPlayers.value = Math.max(value, props.minAllowed);
    }
});
</script>

<template>
    <fieldset>
        <legend class="mb-1 block text-sm font-medium">
            {{ label ?? t('Players') }}: {{ minPlayers }}–{{ maxPlayers }}
            <slot name="hint" />
        </legend>
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label
                    :for="`${idPrefix}-min-players`"
                    class="mb-1 block text-xs text-muted-foreground"
                    >{{ t('Minimum to start') }}</label
                >
                <input
                    :id="`${idPrefix}-min-players`"
                    v-model.number="minPlayers"
                    type="number"
                    :min="minAllowed"
                    :max="maxAllowed"
                    class="w-full rounded border px-2 py-1"
                />
            </div>
            <div>
                <label
                    :for="`${idPrefix}-max-players`"
                    class="mb-1 block text-xs text-muted-foreground"
                    >{{ t('Maximum') }}</label
                >
                <input
                    :id="`${idPrefix}-max-players`"
                    v-model.number="maxPlayers"
                    type="number"
                    :min="minAllowed"
                    :max="maxAllowed"
                    class="w-full rounded border px-2 py-1"
                />
            </div>
        </div>
        <p v-if="minError" class="mt-1 text-sm text-red-600">
            {{ minError }}
        </p>
        <p v-if="maxError" class="mt-1 text-sm text-red-600">
            {{ maxError }}
        </p>
    </fieldset>
</template>
