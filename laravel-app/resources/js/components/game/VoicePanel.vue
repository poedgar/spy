<script setup lang="ts">
import { Headphones, Mic, MicOff, PhoneOff } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/composables/useTrans';
import { useVoiceRoom } from '@/composables/useVoiceRoom';
import type { Game } from '@/types/game';

/** Voice chat for the game's players, while they're in the lobby. */
const props = defineProps<{ game: Game }>();

const { t } = useTrans();
const audioHost = ref<HTMLElement | null>(null);
const {
    status,
    error,
    members,
    micOn,
    audioBlocked,
    inVoice,
    start,
    join,
    leave,
    toggleMic,
    enableAudio,
} = useVoiceRoom(() => props.game.code);

onMounted(() => {
    if (audioHost.value) {
        start(audioHost.value);
    }
});
</script>

<template>
    <div
        id="voice-panel"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-semibold">
                <Headphones class="size-5" />
                {{ t('Voice chat') }}
            </h2>
            <div class="flex gap-2">
                <template v-if="status === 'connected'">
                    <Button
                        id="btn-voice-mic"
                        size="sm"
                        :variant="micOn ? 'outline' : 'secondary'"
                        @click="toggleMic"
                    >
                        <component :is="micOn ? Mic : MicOff" />
                        {{ micOn ? t('Mute') : t('Unmute') }}
                    </Button>
                    <Button
                        id="btn-voice-leave"
                        size="sm"
                        variant="outline"
                        @click="leave"
                    >
                        <PhoneOff />
                        {{ t('Leave voice') }}
                    </Button>
                </template>
                <Button
                    v-else
                    id="btn-voice-join"
                    size="sm"
                    :disabled="status === 'connecting'"
                    @click="audioHost && join(audioHost)"
                >
                    <Mic />
                    {{
                        status === 'connecting'
                            ? t('Connecting…')
                            : t('Join voice')
                    }}
                </Button>
            </div>
        </div>

        <p v-if="status === 'error'" class="mt-2 text-sm text-red-600">
            {{ t('Could not join voice chat.') }} {{ error }}
        </p>
        <p
            v-else-if="status !== 'connected' && inVoice.length > 0"
            id="voice-occupants"
            class="mt-2 text-sm"
        >
            🎙
            {{
                t(':count in voice: :names', {
                    count: inVoice.length,
                    names: inVoice.map((member) => member.name).join(', '),
                })
            }}
        </p>
        <p
            v-else-if="status !== 'connected'"
            class="mt-2 text-sm text-muted-foreground"
        >
            {{ t('Talk with the other players while you play.') }}
        </p>
        <p
            v-if="status === 'connected'"
            class="mt-2 text-xs text-muted-foreground"
        >
            {{
                t(
                    "You'll rejoin voice automatically on this device. Leave voice to stop.",
                )
            }}
        </p>

        <button
            v-if="status === 'connected' && audioBlocked"
            type="button"
            class="mt-2 text-sm text-primary underline underline-offset-4"
            @click="enableAudio"
        >
            {{ t('Click to hear the others') }}
        </button>

        <ul
            v-if="status === 'connected'"
            id="voice-members"
            class="mt-3 flex flex-wrap gap-2 text-sm"
        >
            <li
                v-for="member in members"
                :key="member.identity"
                class="flex items-center gap-1 rounded-full border px-3 py-1"
                :class="
                    member.speaking
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                        : ''
                "
            >
                <MicOff
                    v-if="member.muted"
                    class="size-3.5 text-muted-foreground"
                />
                {{ member.name }}
                <span v-if="member.isMe" class="text-muted-foreground"
                    >({{ t('you') }})</span
                >
            </li>
        </ul>

        <div ref="audioHost" class="hidden" aria-hidden="true" />
    </div>
</template>
