<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Mic, Music, Play, Trophy, Vote } from '@lucide/vue';
import { computed } from 'vue';
import ChatPanel from '@/components/game/ChatPanel.vue';
import HostPanel from '@/components/game/HostPanel.vue';
import LobbyHeader from '@/components/game/LobbyHeader.vue';
import Roster from '@/components/game/Roster.vue';
import RoundHistory from '@/components/game/RoundHistory.vue';
import VoicePanel from '@/components/game/VoicePanel.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameChannel } from '@/composables/useGameChannel';
import { useLobby } from '@/composables/useLobby';
import type { Game } from '@/types/game';

const props = defineProps<{ game: Game }>();

const { t, myId, isHost, canStart, busy, playerName, act, me } = useLobby(
    () => props.game,
);

const song = computed(() => props.game.song ?? null);
const singing = computed(() => props.game.status === 'active');
const voting = computed(() => props.game.status === 'voting');
const inRound = computed(() => singing.value || voting.value);
const isSinger = computed(() => song.value?.singer_user_id === myId.value);
const candidates = computed(() =>
    (song.value?.turn_order ?? []).filter((id) => id !== myId.value),
);
const votesFor = (userId: number) =>
    song.value?.result?.votes.find((entry) => entry.user_id === userId)
        ?.votes ?? 0;

useGameChannel(props.game.id);

function vote(singerId: number) {
    act(`song/vote?singer_id=${singerId}`);
}
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <LobbyHeader :game="game" :in-round="inRound">
            <template #meta>
                <p class="mt-2 text-sm text-muted-foreground">
                    {{
                        t(':count / :max players', {
                            count: game.players.length,
                            max: game.max_players,
                        })
                    }}
                    · {{ t('Sing It Out') }}
                </p>
            </template>
            <template #actions>
                <template v-if="isHost">
                    <Button
                        v-if="!inRound"
                        id="btn-start-song"
                        :disabled="busy || !canStart"
                        @click="act('song/start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Next song')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-if="voting"
                        id="btn-close-voting"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'song/close',
                                t('Close the vote now and count it?'),
                            )
                        "
                    >
                        <Vote />
                        {{ t('Close the vote') }}
                    </Button>
                </template>
            </template>
        </LobbyHeader>

        <HostPanel v-if="isHost && game.status === 'recruiting'" :game="game" />

        <VoicePanel v-if="game.voice_enabled && me" :game="game" />

        <div
            v-if="inRound && song"
            id="clip-card"
            class="rounded-xl border border-primary/60 bg-primary/5 p-4"
        >
            <h2 class="flex items-center gap-2 font-semibold">
                <Music class="size-5" />
                {{ t('Song :number', { number: song.number }) }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
                {{ t('Listen to the clip, then sing how it goes on.') }}
            </p>
            <iframe
                v-if="song.clip_url"
                id="clip-player"
                :key="song.clip_url"
                :src="song.clip_url"
                :title="t('The clip')"
                allow="autoplay; encrypted-media"
                referrerpolicy="strict-origin-when-cross-origin"
                class="mt-3 aspect-video w-full max-w-xl rounded-lg border-0"
            />
        </div>

        <div
            v-if="singing && song"
            id="singing-card"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="flex items-center gap-2 font-semibold">
                <Mic class="size-5" />
                {{
                    t(':done of :total sang', {
                        done: song.sung_count,
                        total: song.turn_order.length,
                    })
                }}
            </h2>
            <p id="current-singer" class="mt-1">
                {{
                    isSinger
                        ? t('Your turn: sing how the clip goes on!')
                        : t(':player is singing.', {
                              player: playerName(song.singer_user_id),
                          })
                }}
            </p>
            <Button
                v-if="isSinger || isHost"
                id="btn-done-singing"
                class="mt-3"
                variant="secondary"
                :disabled="busy"
                @click="act('song/turn')"
            >
                {{
                    isSinger ? t('Done singing') : t('Skip to the next singer')
                }}
            </Button>
        </div>

        <div
            v-if="voting && song"
            id="voting-card"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="flex items-center gap-2 font-semibold">
                <Vote class="size-5" />
                {{ t('Who sang it best?') }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
                {{
                    t(
                        ':voted of :total voted. Votes are secret; you can change yours until the vote closes.',
                        {
                            voted: song.voted_user_ids.length,
                            total: game.players.length,
                        },
                    )
                }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
                <Button
                    v-for="id in candidates"
                    :key="id"
                    :data-vote-for="id"
                    :variant="song.my_vote === id ? 'default' : 'outline'"
                    :disabled="busy"
                    @click="vote(id)"
                >
                    {{ playerName(id) }}
                </Button>
            </div>
        </div>

        <div
            v-if="game.status === 'completed' && song?.result"
            id="song-results"
            class="rounded-xl border p-4"
            :class="
                song.result.winner_user_ids.length
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-sidebar-border/70 dark:border-sidebar-border'
            "
        >
            <h2 class="flex items-center gap-2 text-lg font-bold">
                <Trophy class="size-5" />
                {{
                    song.result.winner_user_ids.length
                        ? t(':names sang it best!', {
                              names: song.result.winner_user_ids
                                  .map((id) => playerName(id))
                                  .join(', '),
                          })
                        : t('Nobody got a vote this time.')
                }}
            </h2>
            <p
                v-if="song.result.title"
                id="song-title"
                class="mt-2 font-semibold"
            >
                “{{ song.result.title }}”<span
                    v-if="song.result.artist"
                    class="font-normal text-muted-foreground"
                >
                    — {{ song.result.artist }}</span
                >
            </p>
            <ul class="mt-3 space-y-1 text-sm">
                <li
                    v-for="id in song.turn_order"
                    :key="id"
                    class="flex justify-between gap-2"
                    :class="
                        song.result.winner_user_ids.includes(id)
                            ? 'font-semibold'
                            : ''
                    "
                >
                    <span>{{ playerName(id) }}</span>
                    <span class="tabular-nums">{{
                        t(':count votes', { count: votesFor(id) })
                    }}</span>
                </li>
            </ul>
        </div>

        <ChatPanel v-if="me" :game="game" />

        <Roster :game="game" :in-round="inRound">
            <template #badge="{ player }">
                <Badge
                    v-if="singing && song?.singer_user_id === player.user.id"
                    variant="outline"
                    >{{ t('singing') }}</Badge
                >
                <Badge
                    v-if="
                        voting && song?.voted_user_ids.includes(player.user.id)
                    "
                    variant="outline"
                    >{{ t('voted') }}</Badge
                >
            </template>
        </Roster>

        <RoundHistory :game="game" />
    </div>
</template>
