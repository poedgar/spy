<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Timer } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useTrans } from '@/composables/useTrans';

/**
 * Counts down to the round's end. At zero it reloads the lobby, and the
 * server applies the timer (vote / reveal) as it serves the page.
 */
const props = defineProps<{ endsAt: string }>();

const { t } = useTrans();
const now = ref(Date.now());
let timer: number | undefined;
let reloaded = false;

const remaining = computed(() =>
    Math.max(
        0,
        Math.ceil((new Date(props.endsAt).getTime() - now.value) / 1000),
    ),
);
const label = computed(() => {
    const minutes = Math.floor(remaining.value / 60);
    const seconds = String(remaining.value % 60).padStart(2, '0');

    return `${minutes}:${seconds}`;
});

onMounted(() => {
    timer = window.setInterval(() => {
        now.value = Date.now();

        if (remaining.value === 0 && !reloaded) {
            reloaded = true;
            window.setTimeout(() => router.reload({ only: ['game'] }), 1000);
        }
    }, 1000);
});

onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
    <span
        id="round-timer"
        class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-sm tabular-nums"
        :class="remaining <= 30 ? 'border-red-500/60 text-red-600' : ''"
        :title="t('Time left in this round')"
    >
        <Timer class="size-4" />
        {{ remaining > 0 ? label : t("Time's up") }}
    </span>
</template>
