<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { Pencil, Plus, Trash2 } from '@lucide/vue';
import { reactive, ref, watch } from 'vue';
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

type WrittenGame = 'finish' | 'meaning';

interface AdminPrompt {
    id: number;
    game: WrittenGame;
    language: 'en' | 'uk';
    text: string;
    /** Interpret the Phrase only: what the phrase really means. */
    meaning: string | null;
    rounds: number;
}

const props = defineProps<{
    prompts: Paginated<AdminPrompt>;
    filters: { q: string; language: string | null; game: string | null };
    counts: Record<WrittenGame, Record<'en' | 'uk', number>>;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Written games', href: '/admin/prompts' }],
    },
});

const { t } = useTrans();
const gameName = (game: string) =>
    game === 'meaning' ? t('Interpret the Phrase') : t('Finish the Phrase');

// --- Filters ------------------------------------------------------------------

const filter = reactive({
    q: props.filters.q,
    language: props.filters.language ?? '',
    game: props.filters.game ?? '',
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

    if (filter.game) {
        query.game = filter.game;
    }

    router.get('/admin/prompts', query, {
        only: ['prompts', 'filters'],
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
watch(() => [filter.language, filter.game], apply);

// --- Add / edit -----------------------------------------------------------------

const editing = ref<AdminPrompt | null>(null);
const open = ref(false);
const form = useForm({ game: 'finish', language: 'en', text: '', meaning: '' });

function openForm(prompt: AdminPrompt | null) {
    editing.value = prompt;
    form.clearErrors();
    form.defaults({
        game: prompt?.game ?? (filter.game || 'finish'),
        language: prompt?.language ?? (filter.language || 'en'),
        text: prompt?.text ?? '',
        meaning: prompt?.meaning ?? '',
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
        form.put(`/admin/prompts/${editing.value.id}`, options);
    } else {
        form.post('/admin/prompts', options);
    }
}

async function remove(prompt: AdminPrompt) {
    if (
        await confirmAction(
            t('Remove ":text"? It won\'t be dealt in new rounds.', {
                text: prompt.text,
            }),
        )
    ) {
        router.delete(`/admin/prompts/${prompt.id}`, { preserveScroll: true });
    }
}
</script>

<template>
    <Head :title="t('Written games')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <div class="flex flex-wrap items-center justify-between gap-2">
            <ul id="prompt-counts" class="text-sm text-muted-foreground">
                <li v-for="(count, game) in counts" :key="game">
                    {{
                        t(':game: :en in English, :uk in Ukrainian', {
                            game: gameName(String(game)),
                            en: count.en,
                            uk: count.uk,
                        })
                    }}
                </li>
            </ul>
            <Button id="btn-add-prompt" @click="openForm(null)">
                <Plus />
                {{ t('Add phrase') }}
            </Button>
        </div>

        <div class="flex flex-wrap gap-2">
            <Input
                id="input-admin-prompt-search"
                v-model="filter.q"
                type="search"
                class="min-w-48 flex-1"
                :placeholder="t('Search phrases')"
            />
            <FilterSelect id="select-admin-prompt-game" v-model="filter.game">
                <option value="">{{ t('Both games') }}</option>
                <option value="finish">{{ t('Finish the Phrase') }}</option>
                <option value="meaning">{{ t('Interpret the Phrase') }}</option>
            </FilterSelect>
            <FilterSelect
                id="select-admin-prompt-language"
                v-model="filter.language"
            >
                <option value="">{{ t('Both languages') }}</option>
                <option value="en">English</option>
                <option value="uk">Українська</option>
            </FilterSelect>
        </div>

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-prompts" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">
                            {{ t('Phrase') }}
                        </th>
                        <th class="px-3 py-2 text-right font-medium">
                            {{ t('Rounds') }}
                        </th>
                        <th class="px-3 py-2">
                            <span class="sr-only">{{ t('Actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="prompts.data.length === 0">
                        <td
                            colspan="3"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{ t('Nothing matches.') }}
                        </td>
                    </tr>
                    <tr
                        v-for="prompt in prompts.data"
                        :key="prompt.id"
                        :data-prompt-id="prompt.id"
                        class="border-t border-sidebar-border/70 dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">
                            <Badge variant="outline" class="mr-2">{{
                                prompt.language.toUpperCase()
                            }}</Badge>
                            <Badge variant="secondary" class="mr-2">{{
                                gameName(prompt.game)
                            }}</Badge>
                            {{ prompt.text }}
                            <div
                                v-if="prompt.meaning"
                                class="mt-1 text-muted-foreground"
                            >
                                {{ prompt.meaning }}
                            </div>
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums">
                            {{ prompt.rounds }}
                        </td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                data-action="edit"
                                :aria-label="t('Edit')"
                                :title="t('Edit')"
                                @click="openForm(prompt)"
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
                                @click="remove(prompt)"
                            >
                                <Trash2 />
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AdminPagination :page="prompts" />
    </div>

    <Dialog v-model:open="open">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{
                    editing ? t('Edit phrase') : t('Add phrase')
                }}</DialogTitle>
                <DialogDescription>
                    {{
                        form.game === 'meaning'
                            ? t(
                                  'An idiom or a saying that players interpret ("Break the ice"), and what it really means, shown after the vote. Games in progress keep the text they were dealt.',
                              )
                            : t(
                                  'The start of a phrase that players finish: half of a saying ("Better late than…") or an open prompt ("The worst excuse for being late is…"). Games in progress keep the text they were dealt.',
                              )
                    }}
                </DialogDescription>
            </DialogHeader>
            <form id="prompt-form" class="grid gap-4" @submit.prevent="save">
                <div class="grid gap-2">
                    <Label for="prompt-game">{{ t('Game') }}</Label>
                    <FilterSelect id="prompt-game" v-model="form.game">
                        <option value="finish">
                            {{ t('Finish the Phrase') }}
                        </option>
                        <option value="meaning">
                            {{ t('Interpret the Phrase') }}
                        </option>
                    </FilterSelect>
                    <InputError :message="form.errors.game" />
                </div>
                <div class="grid gap-2">
                    <Label for="prompt-language">{{ t('Language') }}</Label>
                    <FilterSelect id="prompt-language" v-model="form.language">
                        <option value="en">English</option>
                        <option value="uk">Українська</option>
                    </FilterSelect>
                    <InputError :message="form.errors.language" />
                </div>
                <div class="grid gap-2">
                    <Label for="prompt-text">{{ t('Phrase') }}</Label>
                    <textarea
                        id="prompt-text"
                        v-model="form.text"
                        rows="2"
                        maxlength="255"
                        class="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                    />
                    <InputError :message="form.errors.text" />
                </div>
                <div v-if="form.game === 'meaning'" class="grid gap-2">
                    <Label for="prompt-meaning">{{
                        t('What it really means (optional)')
                    }}</Label>
                    <textarea
                        id="prompt-meaning"
                        v-model="form.meaning"
                        rows="2"
                        maxlength="255"
                        class="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                    />
                    <InputError :message="form.errors.meaning" />
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
                        id="btn-save-prompt"
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
