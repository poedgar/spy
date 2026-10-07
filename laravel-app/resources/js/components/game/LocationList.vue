<script setup lang="ts">
import { computed, ref } from 'vue';
import { Input } from '@/components/ui/input';
import { useTrans } from '@/composables/useTrans';
import type { Categories, Place } from '@/types/game';

const props = defineProps<{
    locations: Place[];
    categories: Categories;
    selectable?: boolean;
    selectedId?: number | null;
}>();

const emit = defineEmits<{ select: [place: Place] }>();

const { t, pick } = useTrans();
const search = ref('');

/** Matches either language, so a guess can be typed in whichever comes first. */
const groups = computed(() => {
    const term = search.value.trim().toLowerCase();
    const matches = props.locations.filter(
        (place) =>
            term === '' ||
            place.en.toLowerCase().includes(term) ||
            place.uk.toLowerCase().includes(term),
    );

    return Object.entries(props.categories)
        .map(([key, name]) => ({
            key,
            name: pick(name),
            places: matches
                .filter((place) => place.category === key)
                .sort((a, b) => pick(a).localeCompare(pick(b))),
        }))
        .filter((group) => group.places.length > 0);
});

const total = computed(() =>
    groups.value.reduce((sum, group) => sum + group.places.length, 0),
);
</script>

<template>
    <div class="flex min-h-0 flex-col gap-3">
        <Input
            v-model="search"
            type="search"
            :placeholder="
                t('Search :count locations…', { count: locations.length })
            "
        />
        <p v-if="total === 0" class="text-sm text-muted-foreground">
            {{ t('No locations match your search.') }}
        </p>
        <div class="min-h-0 space-y-4 overflow-y-auto pr-1">
            <section v-for="group in groups" :key="group.key">
                <h3
                    class="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                    {{ group.name }} ({{ group.places.length }})
                </h3>
                <ul class="grid gap-1 sm:grid-cols-2">
                    <li v-for="place in group.places" :key="place.id">
                        <button
                            v-if="selectable"
                            type="button"
                            class="w-full rounded-md border px-2 py-1 text-left text-sm hover:border-primary"
                            :class="
                                selectedId === place.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-transparent'
                            "
                            @click="emit('select', place)"
                        >
                            {{ pick(place) }}
                        </button>
                        <span v-else class="block px-2 py-1 text-sm">{{
                            pick(place)
                        }}</span>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>
