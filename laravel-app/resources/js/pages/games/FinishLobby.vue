<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { PenLine, Play, Quote, Trophy, Vote } from '@lucide/vue';
import { computed, watch } from 'vue';
import ChatPanel from '@/components/game/ChatPanel.vue';
import HostPanel from '@/components/game/HostPanel.vue';
import LobbyHeader from '@/components/game/LobbyHeader.vue';
import Roster from '@/components/game/Roster.vue';
import RoundHistory from '@/components/game/RoundHistory.vue';
import VoicePanel from '@/components/game/VoicePanel.vue';
import InputError from '@/components/InputError.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameChannel } from '@/composables/useGameChannel';
import { useLobby } from '@/composables/useLobby';
import type { Game } from '@/types/game';

const props = defineProps<{ game: Game }>();

const { t, isHost, canStart, busy, playerName, act, me } = useLobby(
    () => props.game,
);

const finish = computed(() => props.game.finish ?? null);
const writing = computed(() => props.game.status === 'active');
const voting = computed(() => props.game.status === 'voting');
const inRound = computed(() => writing.value || voting.value);
const answeredCount = computed(
    () => finish.value?.answered_user_ids.length ?? 0,
);
const canOpenVote = computed(
    () => answeredCount.value >= (finish.value?.min_answers ?? 2),
);
const winners = computed(() => finish.value?.result?.winner_user_ids ?? []);
// Best first, once names are out.
const results = computed(() =>
    [...(finish.value?.answers ?? [])].sort(
        (a, b) => (b.votes ?? 0) - (a.votes ?? 0),
    ),
);

const form = useForm({ ending: finish.value?.my_answer ?? '' });

// A new round starts with an empty box.
watch(
    () => finish.value?.number,
    () => {
        form.ending = finish.value?.my_answer ?? '';
        form.clearErrors();
    },
);

useGameChannel(props.game.id);

function submit() {
    form.post(`/games/${props.game.code}/finish/answer`, {
        preserveScroll: true,
    });
}

function vote(position: number) {
    act(`finish/vote?answer=${position}`);
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
                    · {{ t('Finish the Phrase') }} ·
                    {{
                        game.phrase_language === 'uk' ? 'Українська' : 'English'
                    }}
                </p>
            </template>
            <template #actions>
                <template v-if="isHost">
                    <Button
                        v-if="!inRound"
                        id="btn-start-finish"
                        :disabled="busy || !canStart"
                        @click="act('finish/start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Next phrase')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-if="writing"
                        id="btn-open-vote"
                        variant="outline"
                        :disabled="busy || !canOpenVote"
                        @click="
                            act(
                                'finish/voting',
                                t(
                                    'Start the vote now? Players who haven\'t written yet will miss this round.',
                                ),
                            )
                        "
                    >
                        <Vote />
                        {{ t('Start the vote') }}
                    </Button>
                    <Button
                        v-if="voting"
                        id="btn-close-voting"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'finish/close',
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
            v-if="finish && game.status !== 'recruiting'"
            id="prompt-card"
            class="rounded-xl border border-primary/60 bg-primary/5 p-4"
        >
            <h2
                class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
            >
                <Quote class="size-4" />
                {{ t('Phrase :number', { number: finish.number }) }}
            </h2>
            <p id="prompt-text" class="mt-2 text-2xl font-semibold">
                {{ finish.prompt }}
            </p>
        </div>

        <div
            v-if="writing && finish"
            id="writing-card"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="flex items-center gap-2 font-semibold">
                <PenLine class="size-5" />
                {{ t('Write your ending') }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
                {{
                    t(
                        ':done of :total wrote. Nobody sees the endings until the vote, and then without names.',
                        { done: answeredCount, total: game.players.length },
                    )
                }}
            </p>
            <form
                v-if="me"
                id="ending-form"
                class="mt-3 grid gap-2"
                @submit.prevent="submit"
            >
                <textarea
                    id="input-ending"
                    v-model="form.ending"
                    rows="2"
                    :maxlength="finish.max_length"
                    :placeholder="t('…and here is how it ends')"
                    class="rounded-md border border-input bg-transparent px-3 py-2 shadow-xs"
                />
                <InputError :message="form.errors.ending" />
                <div class="flex flex-wrap items-center gap-2">
                    <Button
                        id="btn-send-ending"
                        type="submit"
                        :disabled="form.processing || !form.ending.trim()"
                    >
                        {{
                            finish.my_answer
                                ? t('Update my ending')
                                : t('Send my ending')
                        }}
                    </Button>
                    <span
                        v-if="finish.my_answer"
                        id="ending-sent"
                        class="text-sm text-muted-foreground"
                    >
                        {{ t('Sent. You can change it until the vote.') }}
                    </span>
                </div>
            </form>
        </div>

        <div
            v-if="voting && finish?.answers"
            id="voting-card"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="flex items-center gap-2 font-semibold">
                <Vote class="size-5" />
                {{ t('Which ending is the best?') }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
                {{
                    t(
                        ':voted of :total voted. Votes are secret; you can change yours until the vote closes.',
                        {
                            voted: finish.voted_user_ids.length,
                            total: game.players.length,
                        },
                    )
                }}
            </p>
            <div class="mt-3 grid gap-2">
                <button
                    v-for="answer in finish.answers"
                    :key="answer.position"
                    type="button"
                    :data-answer="answer.position"
                    class="rounded-lg border p-3 text-left transition"
                    :class="[
                        finish.my_vote === answer.position
                            ? 'border-primary bg-primary/10'
                            : 'hover:border-primary',
                        answer.mine ? 'cursor-default opacity-60' : '',
                    ]"
                    :disabled="busy || answer.mine || !me"
                    @click="vote(answer.position)"
                >
                    <span class="text-muted-foreground">{{
                        finish.prompt
                    }}</span>
                    <span class="font-medium"> {{ answer.text }}</span>
                    <span
                        v-if="answer.mine"
                        class="ml-2 text-xs text-muted-foreground"
                        >({{ t('yours') }})</span
                    >
                </button>
            </div>
        </div>

        <div
            v-if="game.status === 'completed' && finish?.result"
            id="finish-results"
            class="rounded-xl border p-4"
            :class="
                winners.length
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-sidebar-border/70 dark:border-sidebar-border'
            "
        >
            <h2 class="flex items-center gap-2 text-lg font-bold">
                <Trophy class="size-5" />
                {{
                    winners.length
                        ? t(':names wrote the best ending!', {
                              names: winners
                                  .map((id) => playerName(id))
                                  .join(', '),
                          })
                        : t('Nobody got a vote this time.')
                }}
            </h2>
            <ul class="mt-3 space-y-2 text-sm">
                <li
                    v-for="answer in results"
                    :key="answer.position"
                    class="flex justify-between gap-3"
                    :class="
                        answer.user_id !== null &&
                        winners.includes(answer.user_id)
                            ? 'font-semibold'
                            : ''
                    "
                >
                    <span>
                        <span class="text-muted-foreground"
                            >{{ finish.prompt }}
                        </span>
                        {{ answer.text }}
                        <span class="text-muted-foreground">
                            — {{ playerName(answer.user_id) }}</span
                        >
                    </span>
                    <span class="shrink-0 tabular-nums">{{
                        t(':count votes', { count: answer.votes ?? 0 })
                    }}</span>
                </li>
            </ul>
        </div>

        <ChatPanel v-if="me" :game="game" />

        <Roster :game="game" :in-round="inRound">
            <template #badge="{ player }">
                <Badge
                    v-if="
                        writing &&
                        finish?.answered_user_ids.includes(player.user.id)
                    "
                    variant="outline"
                    >{{ t('wrote') }}</Badge
                >
                <Badge
                    v-if="
                        voting &&
                        finish?.voted_user_ids.includes(player.user.id)
                    "
                    variant="outline"
                    >{{ t('voted') }}</Badge
                >
            </template>
        </Roster>

        <RoundHistory :game="game" />
    </div>
</template>
