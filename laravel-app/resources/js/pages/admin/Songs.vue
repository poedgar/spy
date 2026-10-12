<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { Pencil, Play, Plus, Trash2 } from '@lucide/vue';
import { ref, watch } from 'vue';
import AdminPagination from '@/components/admin/AdminPagination.vue';
import type { Paginated } from '@/components/admin/AdminPagination.vue';
import AdminTabs from '@/components/admin/AdminTabs.vue';
import InputError from '@/components/InputError.vue';
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

interface AdminSong {
    id: number;
    title: string;
    artist: string | null;
    link: string;
    clip_url: string;
    start: string;
    end: string | null;
    rounds: number;
    created_at: string | null;
}

const props = defineProps<{
    songs: Paginated<AdminSong>;
    search: string;
    total: number;
}>();

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Songs', href: '/admin/songs' }],
    },
});

const { t } = useTrans();

// --- Search -------------------------------------------------------------------

const query = ref(props.search);
let timer: number | undefined;

watch(query, (value) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
        router.get('/admin/songs', value.trim() ? { q: value.trim() } : {}, {
            only: ['songs', 'search'],
            preserveState: true,
            replace: true,
        });
    }, 300);
});

// --- Add / edit -----------------------------------------------------------------

const editing = ref<AdminSong | null>(null);
const open = ref(false);
/** The clip being listened to in the list. */
const previewing = ref<number | null>(null);
const form = useForm({ title: '', artist: '', link: '', start: '', end: '' });

function openForm(song: AdminSong | null) {
    editing.value = song;
    form.clearErrors();
    form.defaults({
        title: song?.title ?? '',
        artist: song?.artist ?? '',
        link: song?.link ?? '',
        start: song && song.start !== '0:00' ? song.start : '',
        end: song?.end ?? '',
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
        form.put(`/admin/songs/${editing.value.id}`, options);
    } else {
        form.post('/admin/songs', options);
    }
}

async function remove(song: AdminSong) {
    if (
        await confirmAction(
            t(
                'Remove ":title"? Past rounds keep it; new rounds won\'t use it.',
                { title: song.title },
            ),
        )
    ) {
        router.delete(`/admin/songs/${song.id}`, { preserveScroll: true });
    }
}
</script>

<template>
    <Head :title="t('Songs')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <AdminTabs />

        <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-muted-foreground">
                {{ t(':count songs in play', { count: total }) }}
            </p>
            <Button id="btn-add-song" @click="openForm(null)">
                <Plus />
                {{ t('Add song') }}
            </Button>
        </div>

        <Input
            id="input-admin-song-search"
            v-model="query"
            type="search"
            :placeholder="t('Search by title or artist')"
        />

        <div
            class="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
        >
            <table id="admin-songs" class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th class="px-3 py-2 font-medium">{{ t('Song') }}</th>
                        <th class="px-3 py-2 font-medium">{{ t('Clip') }}</th>
                        <th class="px-3 py-2 text-right font-medium">
                            {{ t('Rounds') }}
                        </th>
                        <th class="px-3 py-2">
                            <span class="sr-only">{{ t('Actions') }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="songs.data.length === 0">
                        <td
                            colspan="4"
                            class="px-3 py-6 text-center text-muted-foreground"
                        >
                            {{
                                total === 0
                                    ? t('No songs yet. Add the first clip.')
                                    : t('Nothing matches.')
                            }}
                        </td>
                    </tr>
                    <tr
                        v-for="song in songs.data"
                        :key="song.id"
                        :data-song-id="song.id"
                        class="border-t border-sidebar-border/70 align-middle dark:border-sidebar-border"
                    >
                        <td class="px-3 py-2">
                            <div class="font-medium">{{ song.title }}</div>
                            <div
                                v-if="song.artist"
                                class="text-muted-foreground"
                            >
                                {{ song.artist }}
                            </div>
                        </td>
                        <td class="px-3 py-2">
                            <iframe
                                v-if="previewing === song.id"
                                :src="song.clip_url"
                                :title="song.title"
                                allow="autoplay; encrypted-media"
                                referrerpolicy="strict-origin-when-cross-origin"
                                class="aspect-video w-64 rounded-md border-0"
                            />
                            <Button
                                v-else
                                variant="outline"
                                size="sm"
                                data-action="preview"
                                @click="previewing = song.id"
                            >
                                <Play />
                                {{
                                    song.end
                                        ? `${song.start}–${song.end}`
                                        : t('From :start', {
                                              start: song.start,
                                          })
                                }}
                            </Button>
                        </td>
                        <td class="px-3 py-2 text-right tabular-nums">
                            {{ song.rounds }}
                        </td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                data-action="edit"
                                :aria-label="t('Edit')"
                                :title="t('Edit')"
                                @click="openForm(song)"
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
                                @click="remove(song)"
                            >
                                <Trash2 />
                            </Button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <AdminPagination :page="songs" />
    </div>

    <Dialog v-model:open="open">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{
                    editing ? t('Edit song') : t('Add song')
                }}</DialogTitle>
                <DialogDescription>
                    {{
                        t(
                            "A YouTube video and the few seconds of it to play, ending where players should carry on. Players can see the video's YouTube title, so give it one that doesn't name the song.",
                        )
                    }}
                </DialogDescription>
            </DialogHeader>
            <form id="song-form" class="grid gap-4" @submit.prevent="save">
                <div class="grid gap-2">
                    <Label for="song-title">{{ t('Title') }}</Label>
                    <Input
                        id="song-title"
                        v-model="form.title"
                        maxlength="150"
                    />
                    <InputError :message="form.errors.title" />
                </div>
                <div class="grid gap-2">
                    <Label for="song-artist">{{
                        t('Artist (optional)')
                    }}</Label>
                    <Input
                        id="song-artist"
                        v-model="form.artist"
                        maxlength="150"
                    />
                    <InputError :message="form.errors.artist" />
                </div>
                <div class="grid gap-2">
                    <Label for="song-link">{{ t('YouTube link') }}</Label>
                    <Input
                        id="song-link"
                        v-model="form.link"
                        type="url"
                        maxlength="300"
                        placeholder="https://youtu.be/…"
                    />
                    <InputError :message="form.errors.link" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                        <Label for="song-start">{{ t('Starts at') }}</Label>
                        <Input
                            id="song-start"
                            v-model="form.start"
                            inputmode="numeric"
                            placeholder="0:45"
                        />
                        <InputError :message="form.errors.start" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="song-end">{{ t('Ends at') }}</Label>
                        <Input
                            id="song-end"
                            v-model="form.end"
                            inputmode="numeric"
                            placeholder="0:55"
                        />
                        <InputError :message="form.errors.end" />
                    </div>
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
                        id="btn-save-song"
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
