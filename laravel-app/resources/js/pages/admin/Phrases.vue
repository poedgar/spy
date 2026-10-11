<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { Pencil, Plus, Trash2 } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import FilterSelect from '@/components/admin/FilterSelect.vue';
import InputError from '@/components/InputError.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { confirmAction } from '@/composables/useConfirm';
import { useTrans } from '@/composables/useTrans';

interface AdminPhrase {
    id: number;
    language: 'en' | 'uk';
    number: number;
    text: string;
    words: number;
}

const props = defineProps<{
    phrases: Paginated<AdminPhrase>;
    filters: { q: string; language: string | null };
    pools: Record<'en' | 'uk', { count: number; longest: number }>;
    maxPlayers: number;
    minWords: number;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Phrases', href: '/admin/phrases' }],
    },
});

const { t } = useTrans();
const languageName = (language: string) =>
    language === 'uk' ? t('Ukrainian phrases') : t('English phrases');

// --- Filters ------------------------------------------------------------------

const filter = reactive({
    q: props.filters.q,
    language: props.filters.language ?? '',
});
let timer: number | undefined;

function apply() {
    const query: Record<string, string> = {};

    if (filter.q.trim()) {
        query.q = filter.q.trim();
    }

    if (filter.language) {
        query.language = filter.language;
    }

    router.get('/admin/phrases', query, {
        only: ['phrases', 'filters'],
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
watch(() => filter.language, apply);

// --- Add / edit -----------------------------------------------------------------

const editing = ref<AdminPhrase | null>(null);
const open = ref(false);
const form = useForm({ language: 'en', text: '' });
/** Counted like the server: words are separated by spaces. */
const wordCount = computed(
    () =>
        form.text
            .trim()
            .split(/\s+/u)
            .filter((word) => /[\p{L}\p{N}]/u.test(word)).length,
);

function openForm(phrase: AdminPhrase | null) {
    editing.value = phrase;
    form.clearErrors();
    form.defaults({
        language: phrase?.language ?? (filter.language || 'en'),
        text: phrase?.text ?? '',
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
        form.put(`/admin/phrases/${editing.value.id}`, options);
    } else {
        form.post('/admin/phrases', options);
    }
}

async function remove(phrase: AdminPhrase) {
    if (
        await confirmAction(
            t('Remove ":text"? It won\'t be dealt in new rounds.', {
                text: phrase.text,
            }),
        )
    ) {
        router.delete(`/admin/phrases/${phrase.id}`, { preserveScroll: true });
    }
}
</script>

<template>
    <Head :title="t('Phrases')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <div class="flex flex-wrap items-start justify-between gap-2">
            <ul
                id="phrase-pools"
                class="space-y-1 text-sm text-muted-foreground"
            >
                <li v-for="(pool, language) in pools" :key="language">
                    {{ languageName(String(language)) }}:
                    {{
                        t(':count phrases, longest :longest words', {
                            count: pool.count,
                            longest: pool.longest,
                        })
                    }}
                    <span
                        v-if="pool.longest < maxPlayers"
                        class="text-amber-600"
                    >
                        ·
                        {{
                            t(
                                "tables of more than :count players can't be dealt",
                                {
                                    count: pool.longest,
                                },
                            )
                        }}
                    </span>
                </li>
            </ul>
            <Button id="btn-add-phrase" @click="openForm(null)">
                <Plus />
                {{ t('Add phrase') }}
            </Button>
        </div>

        <div class="flex flex-wrap gap-2">
            <Input
                id="input-admin-phrase-search"
                v-model="filter.q"
                type="search"
                class="min-w-48 flex-1"
                :placeholder="t('Search phrases')"
            />
            <FilterSelect
                id="select-admin-phrase-language"
                v-model="filter.language"
            >
                <option value="">{{ t('Both languages') }}</option>
                <option value="en">{{ t('English phrases') }}</option>
                <option value="uk">{{ t('Ukrainian phrases') }}</option>
            </FilterSelect>
        </div>

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-phrases" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">{{ t('Phrase') }}</th>
                        <th class="px-3 py-2 text-right font-medium">
                            {{ t('Words') }}
                        </th>
                        <th class="px-3 py-2">
                            <span class="sr-only">{{ t('Actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="phrases.data.length === 0">
                        <td
                            colspan="3"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{ t('Nothing matches.') }}
                        </td>
                    </tr>
                    <tr
                        v-for="phrase in phrases.data"
                        :key="phrase.id"
                        :data-phrase-id="phrase.id"
                        class="border-t border-sidebar-border/70 dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">
                            <Badge variant="outline" class="mr-2">{{
                                phrase.language.toUpperCase()
                            }}</Badge>
                            {{ phrase.text }}
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums">
                            {{ phrase.words }}
                        </td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                data-action="edit"
                                :aria-label="t('Edit')"
                                :title="t('Edit')"
                                @click="openForm(phrase)"
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
                                @click="remove(phrase)"
                            >
                                <Trash2 />
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AdminPagination :page="phrases" />
    </div>

    <Dialog v-model:open="open">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{
                    editing ? t('Edit phrase') : t('Add phrase')
                }}</DialogTitle>
                <DialogDescription>
                    {{
                        t(
                            'Each player is dealt one word, so a phrase needs at least :min words; tables of up to :max players need phrases that long. Games in progress keep the text they were dealt.',
                            { min: minWords, max: maxPlayers },
                        )
                    }}
                </DialogDescription>
            </DialogHeader>
            <form id="phrase-form" class="grid gap-4" @submit.prevent="save">
                <div class="grid gap-2">
                    <Label for="phrase-language">{{ t('Language') }}</Label>
                    <FilterSelect id="phrase-language" v-model="form.language">
                        <option value="en">{{ t('English phrases') }}</option>
                        <option value="uk">{{ t('Ukrainian phrases') }}</option>
                    </FilterSelect>
                    <InputError :message="form.errors.language" />
                </div>
                <div class="grid gap-2">
                    <Label for="phrase-text">{{ t('Phrase') }}</Label>
                    <textarea
                        id="phrase-text"
                        v-model="form.text"
                        rows="3"
                        maxlength="255"
                        class="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t(':count words', { count: wordCount }) }}
                    </p>
                    <InputError :message="form.errors.text" />
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
                        id="btn-save-phrase"
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
