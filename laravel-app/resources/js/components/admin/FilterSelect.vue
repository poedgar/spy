<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';

/** A native select with room for its own chevron, matching the inputs. */
const model = defineModel<string>({ required: true });
defineProps<{ id?: string }>();
</script>

<template>
    <div class="relative">
        <select
            :id="id"
            v-model="model"
            class="h-9 w-full appearance-none rounded-md border border-input bg-transparent pr-9 pl-3 text-sm shadow-xs dark:bg-input/30"
        >
            <slot />
        </select>
        <ChevronDown
            class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
    </div>
</template>
