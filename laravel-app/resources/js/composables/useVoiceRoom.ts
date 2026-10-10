import type { RemoteTrack, Room } from 'livekit-client';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { jsonFetch } from '@/lib/jsonFetch';

export interface VoiceMember {
    identity: string;
    name: string;
    speaking: boolean;
    muted: boolean;
    isMe: boolean;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error';

/** Joining voice once means joining it automatically next time, on this device. */
const AUTO_JOIN_KEY = 'voice.autoJoin';

function rememberAutoJoin(on: boolean): void {
    try {
        if (on) {
            localStorage.setItem(AUTO_JOIN_KEY, '1');
        } else {
            localStorage.removeItem(AUTO_JOIN_KEY);
        }
    } catch {
        // Storage can be unavailable (private mode); auto-join just won't stick.
    }
}

function autoJoinRemembered(): boolean {
    try {
        return localStorage.getItem(AUTO_JOIN_KEY) === '1';
    } catch {
        return false;
    }
}

/** How often a lobby checks who is in voice while you're not. */
const PARTICIPANTS_POLL_MS = 10000;

/**
 * The game's LiveKit voice room. Audio goes straight between the browser
 * and LiveKit; this server only signs the token (GET /games/{code}/voice).
 * Remote voices play through <audio> elements kept in `audioHost`. The
 * LiveKit client is loaded only when someone joins, not with every lobby.
 */
export function useVoiceRoom(code: () => string) {
    const status = ref<Status>('idle');
    const error = ref<string | null>(null);
    const members = ref<VoiceMember[]>([]);
    const micOn = ref(false);
    // Browsers may block sound until the page is clicked again.
    const audioBlocked = ref(false);
    const room = shallowRef<Room | null>(null);
    // Who is talking, seen from outside the room (before joining).
    const inVoice = ref<{ identity: string; name: string }[]>([]);
    const autoJoin = ref(autoJoinRemembered());
    let audioHost: HTMLElement | null = null;
    let poll: number | undefined;

    async function refreshInVoice() {
        if (room.value || document.visibilityState !== 'visible') {
            return;
        }

        inVoice.value = await jsonFetch<{ identity: string; name: string }[]>(
            `/games/${code()}/voice/participants`,
        ).catch(() => []);
    }

    function refresh() {
        const current = room.value;

        if (!current) {
            members.value = [];

            return;
        }

        const local = current.localParticipant;
        members.value = [
            local,
            ...Array.from(current.remoteParticipants.values()),
        ].map((participant) => ({
            identity: participant.identity,
            name: participant.name || participant.identity,
            speaking: participant.isSpeaking,
            muted: !participant.isMicrophoneEnabled,
            isMe: participant === local,
        }));
        micOn.value = local.isMicrophoneEnabled;
        audioBlocked.value = !current.canPlaybackAudio;
    }

    function attach(track: RemoteTrack) {
        if (track.kind === 'audio' && audioHost) {
            audioHost.appendChild(track.attach());
        }
    }

    async function join(host: HTMLElement) {
        if (room.value) {
            return;
        }

        audioHost = host;
        status.value = 'connecting';
        error.value = null;

        try {
            const { url, token } = await jsonFetch<{
                url: string;
                token: string;
            }>(`/games/${code()}/voice`);
            const { Room, RoomEvent } = await import('livekit-client');
            const next = new Room({ adaptiveStream: true, dynacast: true });
            next.on(RoomEvent.TrackSubscribed, (track) => {
                attach(track);
                refresh();
            })
                .on(RoomEvent.TrackUnsubscribed, (track) => {
                    track.detach().forEach((element) => element.remove());
                    refresh();
                })
                .on(RoomEvent.ParticipantConnected, refresh)
                .on(RoomEvent.ParticipantDisconnected, refresh)
                .on(RoomEvent.ActiveSpeakersChanged, refresh)
                .on(RoomEvent.TrackMuted, refresh)
                .on(RoomEvent.TrackUnmuted, refresh)
                .on(RoomEvent.LocalTrackPublished, refresh)
                .on(RoomEvent.AudioPlaybackStatusChanged, refresh)
                .on(RoomEvent.Disconnected, () => {
                    room.value = null;
                    status.value = 'idle';
                    refresh();
                });

            await next.connect(url, token);
            room.value = next;
            status.value = 'connected';
            autoJoin.value = true;
            rememberAutoJoin(true);
            // Join talking; the microphone prompt appears here.
            await next.localParticipant
                .setMicrophoneEnabled(true)
                .catch(() => undefined);
            refresh();
        } catch (caught) {
            error.value =
                caught instanceof Error ? caught.message : String(caught);
            await disconnect();
            status.value = 'error';
        }
    }

    async function toggleMic() {
        const current = room.value;

        if (current) {
            await current.localParticipant
                .setMicrophoneEnabled(
                    !current.localParticipant.isMicrophoneEnabled,
                )
                .catch(() => undefined);
            refresh();
        }
    }

    async function enableAudio() {
        await room.value?.startAudio();
        refresh();
    }

    async function disconnect() {
        const current = room.value;
        room.value = null;
        await current?.disconnect();
        audioHost?.replaceChildren();
        status.value = 'idle';
        refresh();
    }

    /** Leaving on purpose also stops joining automatically next time. */
    async function leave() {
        autoJoin.value = false;
        rememberAutoJoin(false);
        await disconnect();
        void refreshInVoice();
    }

    /** Called once the panel's audio element exists. */
    function start(host: HTMLElement) {
        audioHost = host;

        if (autoJoin.value) {
            void join(host);
        } else {
            void refreshInVoice();
        }

        poll = window.setInterval(
            () => void refreshInVoice(),
            PARTICIPANTS_POLL_MS,
        );
    }

    onBeforeUnmount(() => {
        window.clearInterval(poll);
        // Leaving the lobby isn't leaving voice on purpose: keep auto-join.
        void disconnect();
    });

    return {
        status,
        error,
        members,
        micOn,
        audioBlocked,
        inVoice,
        autoJoin,
        start,
        join,
        leave,
        toggleMic,
        enableAudio,
    };
}
