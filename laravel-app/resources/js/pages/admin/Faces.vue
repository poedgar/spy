<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { reactive, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import FilterSelect from '@/components/admin/FilterSelect.vue';
import StatCards from '@/components/admin/StatCards.vue';
import FaceCredit from '@/components/game/FaceCredit.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { Emotion, EmotionLevel } from '@/types/game';

interface AdminFace {
    id: number;
    image_url: string;
    emotion: Emotion;
    variant: string;
    base_level: EmotionLevel;
    level: EmotionLevel;
    /** Enough answers for the hit rate to decide the level. */
    measured: boolean;
    shown: number;
    hit_rate: number | null;
    active: boolean;
}

const props = defineProps<{
    faces: Paginated<AdminFace>;
    filters: {
        emotion: Emotion | null;
        level: EmotionLevel | null;
        sort: string | null;
    };
    stats: {
        total: number;
        active: number;
        measured: number;
        answers: number;
        levels: Record<EmotionLevel, number>;
    };
    rules: { min_answers: number; easy_from: number; medium_from: number };
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Faces', href: '/admin/faces' }],
    },
});

const { t } = useTrans();
const { emotions, emotionLevels } = useGameLabels();

const filter = reactive({
    emotion: props.filters.emotion ?? '',
    level: props.filters.level ? String(props.filters.level) : '',
    sort: props.filters.sort ?? '',
});

watch(
    () => [filter.emotion, filter.level, filter.sort],
    () => {
        const query: Record<string, string> = {};

        for (const [key, value] of Object.entries(filter)) {
            if (value) {
                query[key] = value;
            }
        }

        router.get('/admin/faces', query, {
            only: ['faces', 'filters'],
            preserveState: true,
            replace: true,
        });
    },
);

const percent = (rate: number) => Math.round(rate * 100);

function setActive(face: AdminFace, active: boolean) {
    router.put(`/admin/faces/${face.id}`, { active }, { preserveScroll: true });
}
</script>

<template>
    <Head :title="t('Faces')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <StatCards
            :items="[
                { label: t('Faces in play'), value: stats.active },
                {
                    label: emotionLevels[1].label,
                    value: stats.levels[1],
                },
                {
                    label: emotionLevels[2].label,
                    value: stats.levels[2],
                },
                {
                    label: emotionLevels[3].label,
                    value: stats.levels[3],
                },
                { label: t('Measured faces'), value: stats.measured },
                { label: t('Answers so far'), value: stats.answers },
            ]"
        />

        <p class="text-sm text-muted-foreground">
            {{
                t(
                    'Each face starts at the level of its expression. After :min answers, its hit rate decides: :easy% or more is easy, :medium% or more is medium, below that is hard.',
                    {
                        min: rules.min_answers,
                        easy: percent(rules.easy_from),
                        medium: percent(rules.medium_from),
                    },
                )
            }}
        </p>

        <div class="flex flex-wrap gap-2">
            <FilterSelect id="select-face-emotion" v-model="filter.emotion">
                <option value="">{{ t('All emotions') }}</option>
                <option
                    v-for="(label, value) in emotions"
                    :key="value"
                    :value="value"
                >
                    {{ label }}
                </option>
            </FilterSelect>
            <FilterSelect id="select-face-level" v-model="filter.level">
                <option value="">{{ t('All levels') }}</option>
                <option
                    v-for="(level, value) in emotionLevels"
                    :key="value"
                    :value="String(value)"
                >
                    {{ level.label }}
                </option>
            </FilterSelect>
            <FilterSelect id="select-face-sort" v-model="filter.sort">
                <option value="">{{ t('By emotion') }}</option>
                <option value="hardest">{{ t('Hardest first') }}</option>
                <option value="easiest">{{ t('Easiest first') }}</option>
                <option value="most_shown">{{ t('Most shown first') }}</option>
            </FilterSelect>
        </div>

        <p
            v-if="faces.data.length === 0"
            class="rounded-xl border border-sidebar-border/70 px-3 py-6 text-center text-sm text-muted-foreground dark:border-sidebar-border"
        >
            {{ t('Nothing matches.') }}
        </p>

        <ul
            id="admin-faces"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
            <li
                v-for="face in faces.data"
                :key="face.id"
                :data-face-id="face.id"
                class="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
                :class="{ 'opacity-50': !face.active }"
            >
                <img
                    :src="face.image_url"
                    :alt="emotions[face.emotion]"
                    loading="lazy"
                    class="aspect-square w-full bg-muted object-cover"
                />
                <div class="space-y-1 p-2 text-xs">
                    <div class="flex flex-wrap items-center gap-1">
                        <Badge variant="secondary">{{
                            emotions[face.emotion]
                        }}</Badge>
                        <Badge variant="outline">{{
                            emotionLevels[face.level].label
                        }}</Badge>
                    </div>
                    <div class="text-muted-foreground">{{ face.variant }}</div>
                    <div class="tabular-nums">
                        <template v-if="face.hit_rate !== null">
                            {{
                                t(':percent% right of :count', {
                                    percent: percent(face.hit_rate),
                                    count: face.shown,
                                })
                            }}
                        </template>
                        <template v-else>{{ t('Not shown yet') }}</template>
                        <span
                            v-if="!face.measured"
                            class="text-muted-foreground"
                        >
                            · {{ t('level from expression') }}</span
                        >
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        class="h-7 px-2"
                        :data-action="face.active ? 'deactivate' : 'activate'"
                        @click="setActive(face, !face.active)"
                    >
                        {{
                            face.active ? t('Take out of play') : t('Put back')
                        }}
                    </Button>
                </div>
            </li>
        </ul>

        <AdminPagination :page="faces" />

        <FaceCredit />
    </div>
</template>
