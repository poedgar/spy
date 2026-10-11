<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { Pencil, Plus, Trash2 } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import FilterSelect from '@/components/admin/FilterSelect.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmAction } from '@/composables/useConfirm';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';

interface AdminLocation {
    id: number;
    en: string;
    uk: string;
    category: string;
    tier: string;
}

const props = defineProps<{
    locations: Paginated<AdminLocation>;
    filters: { q: string; category: string | null; tier: string | null };
    categories: Record<string, { en: string; uk: string }>;
    tiers: string[];
    total: number;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Locations', href: '/admin/locations' }],
    },
});

const { t, locale } = useTrans();
const { tiers: tierLabels } = useGameLabels();
const categoryName = (key: string) =>
    props.categories[key]?.[locale.value === 'uk' ? 'uk' : 'en'] ?? key;
const tierName = (tier: string) =>
    (tierLabels.value as Record<string, { label: string }>)[tier]?.label ??
    tier;

// --- Filters ------------------------------------------------------------------

const filter = reactive({
    q: props.filters.q,
    category: props.filters.category ?? '',
    tier: props.filters.tier ?? '',
});
let timer: number | undefined;

function apply() {
    const query: Record<string, string> = {};

    for (const [key, value] of Object.entries(filter)) {
        if (value.trim()) {
            query[key] = value.trim();
        }
    }

    router.get('/admin/locations', query, {
        only: ['locations', 'filters'],
        preserveState: true,
        replace: true,
    });
}

watch(
    () => filter.q,
    () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(apply, 300);
    },
);
watch(() => [filter.category, filter.tier], apply);

// --- Add / edit -----------------------------------------------------------------

const editing = ref<AdminLocation | null>(null);
const open = ref(false);
const form = useForm({ en: '', uk: '', category: '', tier: '' });
const title = computed(() =>
    editing.value ? t('Edit location') : t('Add location'),
);

function openForm(location: AdminLocation | null) {
    editing.value = location;
    form.clearErrors();
    form.defaults({
        en: location?.en ?? '',
        uk: location?.uk ?? '',
        // A new location starts in the filtered category and tier, if any.
        category:
            location?.category ||
            filter.category ||
            Object.keys(props.categories)[0],
        tier: location?.tier || filter.tier || props.tiers[0],
    });
    form.reset();
    open.value = true;
}

function save() {
    const options = {
        preserveScroll: true,
        onSuccess: () => (open.value = false),
    };

    if (editing.value) {
        form.put(`/admin/locations/${editing.value.id}`, options);
    } else {
        form.post('/admin/locations', options);
    }
}

async function remove(location: AdminLocation) {
    if (
        await confirmAction(
            t(
                'Remove ":name"? Past rounds keep it; new rounds won\'t use it.',
                {
                    name: location[locale.value === 'uk' ? 'uk' : 'en'],
                },
            ),
        )
    ) {
        router.delete(`/admin/locations/${location.id}`, {
            preserveScroll: true,
        });
    }
}
</script>

<template>
    <Head :title="t('Locations')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-muted-foreground">
                {{ t(':count locations in play', { count: total }) }}
            </p>
            <Button id="btn-add-location" @click="openForm(null)">
                <Plus />
                {{ t('Add location') }}
            </Button>
        </div>

        <div class="flex flex-wrap gap-2">
            <Input
                id="input-admin-location-search"
                v-model="filter.q"
                type="search"
                class="min-w-48 flex-1"
                :placeholder="t('Search in either language')"
            />
            <FilterSelect
                id="select-admin-location-category"
                v-model="filter.category"
            >
                <option value="">{{ t('All categories') }}</option>
                <option v-for="(_, key) in categories" :key="key" :value="key">
                    {{ categoryName(String(key)) }}
                </option>
            </FilterSelect>
            <FilterSelect id="select-admin-location-tier" v-model="filter.tier">
                <option value="">{{ t('All ages') }}</option>
                <option v-for="tier in tiers" :key="tier" :value="tier">
                    {{ tierName(tier) }}
                </option>
            </FilterSelect>
        </div>

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-locations" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">English</th>
                        <th class="px-3 py-2 font-medium">Українська</th>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Category') }}
                        </th>
                        <th class="px-3 py-2 font-medium">{{ t('Ages') }}</th>
                        <th class="px-3 py-2">
                            <span class="sr-only">{{ t('Actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="locations.data.length === 0">
                        <td
                            colspan="5"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{ t('Nothing matches.') }}
                        </td>
                    </tr>
                    <tr
                        v-for="location in locations.data"
                        :key="location.id"
                        :data-location-id="location.id"
                        class="border-t border-sidebar-border/70 dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">{{ location.en }}</td>
                        <td class="px-3 py-2">{{ location.uk }}</td>
                        <td class="px-3 py-2">
                            {{ categoryName(location.category) }}
                        </td>
                        <td class="px-3 py-2">{{ tierName(location.tier) }}</td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                data-action="edit"
                                :aria-label="t('Edit')"
                                :title="t('Edit')"
                                @click="openForm(location)"
                            >
                                <Pencil />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                class="text-red-600"
                                data-action="remove"
                                :aria-label="t('Remove')"
                                :title="t('Remove')"
                                @click="remove(location)"
                            >
                                <Trash2 />
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AdminPagination :page="locations" />
    </div>

    <Dialog v-model:open="open">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
            </DialogHeader>
            <form id="location-form" class="grid gap-4" @submit.prevent="save">
                <div class="grid gap-2">
                    <Label for="location-en">English</Label>
                    <Input id="location-en" v-model="form.en" maxlength="100" />
                    <InputError :message="form.errors.en" />
                </div>
                <div class="grid gap-2">
                    <Label for="location-uk">Українська</Label>
                    <Input id="location-uk" v-model="form.uk" maxlength="100" />
                    <InputError :message="form.errors.uk" />
                </div>
                <div class="grid gap-2">
                    <Label for="location-category">{{ t('Category') }}</Label>
                    <FilterSelect
                        id="location-category"
                        v-model="form.category"
                    >
                        <option
                            v-for="(_, key) in categories"
                            :key="key"
                            :value="key"
                        >
                            {{ categoryName(String(key)) }}
                        </option>
                    </FilterSelect>
                    <InputError :message="form.errors.category" />
                </div>
                <div class="grid gap-2">
                    <Label for="location-tier">{{ t('Ages') }}</Label>
                    <FilterSelect id="location-tier" v-model="form.tier">
                        <option v-for="tier in tiers" :key="tier" :value="tier">
                            {{ tierName(tier) }}
                        </option>
                    </FilterSelect>
                    <InputError :message="form.errors.tier" />
                </div>
                <DialogFooter class="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        @click="open = false"
                    >
                        {{ t('Cancel') }}
                    </Button>
                    <Button
                        id="btn-save-location"
                        type="submit"
                        :disabled="form.processing"
                    >
                        {{ t('Save') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
