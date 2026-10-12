<script setup lang="ts">
import { Dices } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/composables/useTrans';
import { jsonFetch } from '@/lib/jsonFetch';
import type { GameType } from '@/types/game';

/**
 * A game's name: suggested by the app (and re-rolled with the dice),
 * yours to edit. Starts with a suggestion when empty.
 */
const model = defineModel<string>({ required: true });
const props = defineProps<{
    type: GameType;
    id: string;
    placeholder?: string;
}>();

const { t } = useTrans();
const rolling = ref(false);

/** The dice always replaces the name; the first suggestion only fills a blank. */
async function roll(onlyIfBlank = false) {
    rolling.value = true;

    try {
        const { title } = await jsonFetch<{ title: string }>(
            `/game-name?type=${props.type}`,
        );

        if (!onlyIfBlank || !model.value.trim()) {
            model.value = title;
        }
    } catch {
        // Keep whatever is there; typing a name still works.
    } finally {
        rolling.value = false;
    }
}

onMounted(() => {
    if (!model.value.trim()) {
        void roll(true);
    }
});
</script>

<template>
    <div class="flex gap-2">
        <input
            :id="id"
            v-model="model"
            type="text"
            maxlength="255"
            :placeholder="placeholder"
            class="w-full rounded border px-2 py-1"
        />
        <Button
            type="button"
            variant="outline"
            size="icon"
            :data-test="`${id}-roll`"
            :disabled="rolling"
            :title="t('Suggest another name')"
            :aria-label="t('Suggest another name')"
            @click="roll()"
        >
            <Dices />
        </Button>
    </div>
</template>
