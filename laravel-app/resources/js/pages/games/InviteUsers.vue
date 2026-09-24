<script setup lang="ts">
import { computed } from 'vue';
import { Head, useForm } from '@inertiajs/vue3';
import { usePresence } from '@/composables/usePresence';

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
}>();

const { onlineUserIds } = usePresence();

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
    form.post(`/games/${props.game.code}/invitations`, { preserveScroll: true });
}
</script>

<template>
    <Head :title="`Invite Players — ${game.title}`" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">Invite Players to {{ game.title }}</h1>
        <p v-if="form.errors.to_user_id" class="text-sm text-red-600">{{ form.errors.to_user_id }}</p>

        <ul id="invite-users-list" class="space-y-2">
            <li
                v-for="user in sortedUsers"
                :key="user.id"
                class="flex items-center justify-between rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border"
            >
                <span class="flex items-center gap-2">
                    <span
                        :class="[
                            'inline-block h-2 w-2 rounded-full',
                            onlineUserIds.has(user.id) ? 'bg-green-500' : 'bg-muted-foreground/40',
                        ]"
                    />
                    {{ user.codename }}
                </span>

                <span v-if="user.invite_status === 'pending'" class="text-sm text-muted-foreground">
                    Invited
                </span>
                <button
                    v-else
                    type="button"
                    class="text-sm text-primary underline underline-offset-4"
                    :disabled="form.processing"
                    @click="invite(user.id)"
                >
                    Invite
                </button>
            </li>
        </ul>
    </div>
</template>
