<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import { Input } from '@/components/ui/input';
import { usePresence } from '@/composables/usePresence';
import { useTrans } from '@/composables/useTrans';

interface UserRow {
    id: number;
    name: string;
    codename: string;
    invite_status: 'pending' | null;
}

interface GameProp {
    id: number;
    code: string;
    title: string;
}

const props = defineProps<{
    game: GameProp;
    users: UserRow[];
    search: string;
}>();

const query = ref(props.search);
let searchTimer: number | undefined;

// Without a search the list shows past teammates; searching reaches anyone.
watch(query, (value) => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
        router.get(
            `/games/${props.game.code}/invite`,
            value.trim() ? { q: value.trim() } : {},
            { only: ['users', 'search'], preserveState: true, replace: true },
        );
    }, 300);
});

const { onlineUserIds } = usePresence();
const { t } = useTrans();

const sortedUsers = computed(() =>
    [...props.users].sort((a, b) => {
        const aOnline = onlineUserIds.value.has(a.id);
        const bOnline = onlineUserIds.value.has(b.id);
        if (aOnline !== bOnline) {
            return aOnline ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    }),
);

const form = useForm({ to_user_id: null as number | null });

function invite(userId: number) {
    form.to_user_id = userId;
    form.post(`/games/${props.game.code}/invitations`, {
        preserveScroll: true,
    });
}
</script>

<template>
    <Head :title="t('Invite Players to :game', { game: game.title })" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">
            {{ t('Invite Players to :game', { game: game.title }) }}
        </h1>
        <Link
            :href="`/games/${game.code}`"
            class="text-sm text-primary underline underline-offset-4"
            >← {{ t('Back to the lobby') }}</Link
        >
        <p v-if="form.errors.to_user_id" class="text-sm text-red-600">
            {{ form.errors.to_user_id }}
        </p>

        <Input
            id="input-invite-search"
            v-model="query"
            type="search"
            :placeholder="t('Search players by name or codename')"
        />
        <p v-if="users.length === 0" class="text-sm text-muted-foreground">
            {{
                query.trim().length >= 2
                    ? t('Nobody matches that search.')
                    : t(
                          'Players you have played with appear here. Search to find anyone else.',
                      )
            }}
        </p>

        <ul id="invite-users-list" class="space-y-2">
            <li
                v-for="user in sortedUsers"
                :key="user.id"
                :data-user-name="user.name"
                class="flex items-center justify-between rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border"
            >
                <span class="flex items-center gap-2">
                    <span
                        :class="[
                            'inline-block h-2 w-2 rounded-full',
                            onlineUserIds.has(user.id)
                                ? 'bg-green-500'
                                : 'bg-muted-foreground/40',
                        ]"
                    />
                    {{ user.codename }}
                </span>

                <span
                    v-if="user.invite_status === 'pending'"
                    class="text-sm text-muted-foreground"
                >
                    {{ t('Invited') }}
                </span>
                <button
                    v-else
                    type="button"
                    class="text-sm text-primary underline underline-offset-4"
                    :disabled="form.processing"
                    @click="invite(user.id)"
                >
                    {{ t('Invite') }}
                </button>
            </li>
        </ul>
    </div>
</template>
