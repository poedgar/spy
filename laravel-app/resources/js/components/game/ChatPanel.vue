<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { MessageSquare, Send } from '@lucide/vue';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTrans } from '@/composables/useTrans';
import echo from '@/echo';
import { jsonFetch } from '@/lib/jsonFetch';
import type { Game } from '@/types/game';

interface ChatMessage {
    id: number;
    body: string;
    created_at: string | null;
    user: { id: number; codename: string; name: string };
}

/** How often to check for messages while live updates are down. */
const FALLBACK_POLL_MS = 5000;
const MAX_LENGTH = 500;

/** Text chat for the game's players, in the lobby. */
const props = defineProps<{ game: Game }>();

const { t } = useTrans();
const page = usePage<{ auth: { user: { id: number } } }>();
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const sending = ref(false);
const error = ref<string | null>(null);
const list = ref<HTMLElement | null>(null);
const connection = echo.connector.pusher.connection;
const channelName = `game.${props.game.id}`;
let subscribed = false;
let timer: number | undefined;

async function scrollToEnd() {
    await nextTick();
    list.value?.scrollTo({ top: list.value.scrollHeight });
}

/** Adds messages it doesn't have yet, keeping them in order. */
function merge(incoming: ChatMessage[]) {
    const known = new Set(messages.value.map((message) => message.id));
    const fresh = incoming.filter((message) => !known.has(message.id));

    if (fresh.length > 0) {
        messages.value = [...messages.value, ...fresh].sort(
            (a, b) => a.id - b.id,
        );
        void scrollToEnd();
    }
}

async function load() {
    merge(
        await jsonFetch<ChatMessage[]>(
            `/games/${props.game.code}/messages`,
        ).catch(() => []),
    );
}

async function send() {
    const body = draft.value.trim();

    if (!body || sending.value) {
        return;
    }

    sending.value = true;
    error.value = null;

    try {
        merge([
            await jsonFetch<ChatMessage>(`/games/${props.game.code}/messages`, {
                method: 'POST',
                body: { body },
            }),
        ]);
        draft.value = '';
    } catch (caught) {
        error.value = caught instanceof Error ? caught.message : String(caught);
    } finally {
        sending.value = false;
    }
}

function time(iso: string | null): string {
    return iso
        ? new Date(iso).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';
}

onMounted(() => {
    void load();

    // The lobby's game channel; useGameChannel owns joining and leaving it.
    echo.private(channelName)
        .subscribed(() => (subscribed = true))
        .error(() => (subscribed = false))
        .listen('.chat.message', (payload: { message: ChatMessage }) =>
            merge([payload.message]),
        );
    // Already subscribed (by the lobby) means no new "subscribed" event.
    subscribed ||= Boolean(
        echo.connector.pusher.channel(`private-${channelName}`)?.subscribed,
    );

    timer = window.setInterval(() => {
        const live = connection.state === 'connected' && subscribed;

        if (!live && document.visibilityState === 'visible') {
            void load();
        }
    }, FALLBACK_POLL_MS);
});

onBeforeUnmount(() => {
    window.clearInterval(timer);
    echo.private(channelName).stopListening('.chat.message');
});
</script>

<template>
    <div
        id="chat-panel"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <h2 class="flex items-center gap-2 font-semibold">
            <MessageSquare class="size-5" />
            {{ t('Chat') }}
        </h2>

        <ul
            ref="list"
            id="chat-messages"
            class="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm"
        >
            <li v-if="messages.length === 0" class="text-muted-foreground">
                {{ t('No messages yet. Say hello!') }}
            </li>
            <li
                v-for="message in messages"
                :key="message.id"
                :class="
                    message.user.id === page.props.auth.user.id
                        ? 'ml-8 rounded-lg bg-primary/5 px-3 py-2'
                        : 'mr-8 rounded-lg bg-muted px-3 py-2'
                "
            >
                <span class="flex items-baseline justify-between gap-2">
                    <span class="font-semibold">{{
                        message.user.codename
                    }}</span>
                    <span class="text-xs text-muted-foreground">{{
                        time(message.created_at)
                    }}</span>
                </span>
                <span class="block break-words whitespace-pre-wrap">{{
                    message.body
                }}</span>
            </li>
        </ul>

        <form id="chat-form" class="mt-3 flex gap-2" @submit.prevent="send">
            <Input
                id="input-chat"
                v-model="draft"
                :maxlength="MAX_LENGTH"
                :placeholder="t('Write a message')"
                autocomplete="off"
            />
            <Button
                id="btn-chat-send"
                type="submit"
                :disabled="sending || !draft.trim()"
                :aria-label="t('Send')"
            >
                <Send />
            </Button>
        </form>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </div>
</template>
