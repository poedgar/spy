import type { RemoteTrack, Room } from 'livekit-client';
import { onBeforeUnmount, ref, shallowRef } from 'vue';

export interface VoiceMember {
    identity: string;
    name: string;
    speaking: boolean;
    muted: boolean;
    isMe: boolean;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error';

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
    let audioHost: HTMLElement | null = null;

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
            const response = await fetch(`/games/${code()}/voice`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(
                    (await response.json().catch(() => null))?.message ??
                        `HTTP ${response.status}`,
                );
            }

            const { url, token } = (await response.json()) as {
                url: string;
                token: string;
            };
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
            // Join talking; the microphone prompt appears here.
            await next.localParticipant
                .setMicrophoneEnabled(true)
                .catch(() => undefined);
            refresh();
        } catch (caught) {
            status.value = 'error';
            error.value =
                caught instanceof Error ? caught.message : String(caught);
            await leave();
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

    async function leave() {
        const current = room.value;
        room.value = null;
        await current?.disconnect();
        audioHost?.replaceChildren();
        status.value = 'idle';
        refresh();
    }

    onBeforeUnmount(() => {
        void leave();
    });

    return {
        status,
        error,
        members,
        micOn,
        audioBlocked,
        join,
        leave,
        toggleMic,
        enableAudio,
    };
}
