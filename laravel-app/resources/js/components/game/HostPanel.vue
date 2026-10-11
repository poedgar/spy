<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Check, RefreshCw, X } from '@lucide/vue';
import { ref, watch } from 'vue';
import GameNameInput from '@/components/GameNameInput.vue';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/composables/useTrans';
import type { Game } from '@/types/game';

const props = defineProps<{ game: Game }>();

const { t } = useTrans();
const busy = ref(false);

function send(method: 'post' | 'delete', path: string, data = {}) {
    busy.value = true;
    router[method](`/games/${props.game.code}/${path}`, data, {
        preserveScroll: true,
        onFinish: () => (busy.value = false),
    });
}

const setApproval = (requiresApproval: boolean) =>
    send('post', 'settings', { requires_approval: requiresApproval });
const setListed = (isListed: boolean) =>
    send('post', 'settings', { is_listed: isListed });

// Renaming is allowed until the first round (game.can_rename).
const name = ref(props.game.title);
watch(
    () => props.game.title,
    (title) => (name.value = title),
);
const rename = () => {
    if (name.value.trim() && name.value.trim() !== props.game.title) {
        send('post', 'settings', { title: name.value.trim() });
    }
};
</script>

<template>
    <div
        id="host-panel"
        class="space-y-4 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <form
            v-if="game.can_rename"
            id="rename-game-form"
            class="space-y-1"
            @submit.prevent="rename"
        >
            <label for="input-rename-game" class="block font-medium">{{
                t('Game name')
            }}</label>
            <div class="flex gap-2">
                <div class="flex-1">
                    <GameNameInput
                        id="input-rename-game"
                        v-model="name"
                        :type="game.game_type"
                    />
                </div>
                <Button
                    id="btn-rename-game"
                    type="submit"
                    :disabled="
                        busy || !name.trim() || name.trim() === game.title
                    "
                >
                    {{ t('Save') }}
                </Button>
            </div>
            <p class="text-sm text-muted-foreground">
                {{ t('You can change the name until the game starts.') }}
            </p>
        </form>

        <label class="flex items-start gap-3">
            <input
                id="toggle-approval"
                type="checkbox"
                class="mt-1"
                :checked="game.requires_approval"
                :disabled="busy"
                @change="
                    setApproval(($event.target as HTMLInputElement).checked)
                "
            />
            <span>
                <span class="block font-medium">{{
                    t('Approve new players')
                }}</span>
                <span class="block text-sm text-muted-foreground">{{
                    t(
                        'People joining with the code ask first, and you let them in. Invited players skip the queue.',
                    )
                }}</span>
            </span>
        </label>

        <label class="flex items-start gap-3">
            <input
                id="toggle-listed"
                type="checkbox"
                class="mt-1"
                :checked="game.is_listed"
                :disabled="busy"
                @change="setListed(($event.target as HTMLInputElement).checked)"
            />
            <span>
                <span class="block font-medium">{{
                    t('List in open games')
                }}</span>
                <span class="block text-sm text-muted-foreground">{{
                    t(
                        'Anyone can find this game and ask to join. Off: only people with the code or an invitation.',
                    )
                }}</span>
            </span>
        </label>

        <div v-if="game.join_requests?.length" id="join-requests">
            <h3 class="mb-1 font-semibold">{{ t('Asking to join') }}</h3>
            <ul class="space-y-1">
                <li
                    v-for="request in game.join_requests"
                    :key="request.id"
                    class="flex items-center justify-between gap-2"
                    :data-join-request="request.user.codename"
                >
                    <span
                        >{{ request.user.codename }}
                        <span class="text-sm text-muted-foreground">{{
                            request.user.name
                        }}</span></span
                    >
                    <span class="flex gap-1">
                        <Button
                            size="sm"
                            :disabled="busy"
                            data-action="approve"
                            @click="
                                send(
                                    'post',
                                    `join-requests/${request.id}/approve`,
                                )
                            "
                        >
                            <Check />
                            {{ t('Let in') }}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            :disabled="busy"
                            data-action="decline"
                            @click="
                                send(
                                    'post',
                                    `join-requests/${request.id}/decline`,
                                )
                            "
                        >
                            <X />
                            {{ t('Decline') }}
                        </Button>
                    </span>
                </li>
            </ul>
        </div>

        <div v-if="game.invitations?.length" id="outstanding-invitations">
            <h3 class="mb-1 font-semibold">{{ t('Invited, not joined') }}</h3>
            <ul class="space-y-1">
                <li
                    v-for="invitation in game.invitations"
                    :key="invitation.id"
                    class="flex flex-wrap items-center justify-between gap-2"
                    :data-invitation="invitation.user.codename"
                >
                    <span
                        >{{ invitation.user.codename }}
                        <span class="text-sm text-muted-foreground"
                            >·
                            {{
                                invitation.status === 'declined'
                                    ? t('declined')
                                    : t('no answer yet')
                            }}</span
                        ></span
                    >
                    <span class="flex gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            :disabled="busy"
                            data-action="resend"
                            @click="
                                send('post', 'invitations', {
                                    to_user_id: invitation.user.id,
                                })
                            "
                        >
                            <RefreshCw />
                            {{ t('Invite again') }}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            :disabled="busy"
                            data-action="cancel"
                            @click="
                                send('delete', `invitations/${invitation.id}`)
                            "
                        >
                            <X />
                            {{ t('Cancel invitation') }}
                        </Button>
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>
