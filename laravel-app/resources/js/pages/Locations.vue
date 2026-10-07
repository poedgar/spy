<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import LocationList from '@/components/game/LocationList.vue';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { AgeTier, Categories, Place } from '@/types/game';

const props = defineProps<{
    locations: (Place & { tier: AgeTier })[];
    categories: Categories;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Locations', href: '/locations' }],
    },
});

const { t } = useTrans();
const { tiers } = useGameLabels();

// Tiers are cumulative, like the server's draw: teens include children.
const included: Record<AgeTier, AgeTier[]> = {
    children: ['children'],
    teens: ['children', 'teens'],
    adults: ['children', 'teens', 'adults'],
};

const tier = ref<AgeTier>('adults');
const pool = computed(() =>
    props.locations.filter((place) =>
        included[tier.value].includes(place.tier),
    ),
);
</script>

<template>
    <Head :title="t('Locations')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div>
            <h1 class="text-xl font-bold">{{ t('Location guide') }}</h1>
            <p class="text-sm text-muted-foreground">
                {{
                    t(
                        'Every place a round can be set in. A game draws from its age group and every younger one.',
                    )
                }}
            </p>
        </div>

        <div class="flex flex-wrap gap-2" role="radiogroup">
            <button
                v-for="(label, key) in tiers"
                :key="key"
                type="button"
                role="radio"
                :aria-checked="tier === key"
                class="rounded-md border px-3 py-1.5 text-sm"
                :class="tier === key ? 'border-primary bg-primary/10' : ''"
                @click="tier = key"
            >
                {{ label.label }}
            </button>
        </div>

        <LocationList :key="tier" :locations="pool" :categories="categories" />
    </div>
</template>
