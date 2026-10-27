<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Check, Eye, Play, Smile, X } from '@lucide/vue';
import { computed } from 'vue';
import ChatPanel from '@/components/game/ChatPanel.vue';
import FaceCredit from '@/components/game/FaceCredit.vue';
import HostPanel from '@/components/game/HostPanel.vue';
import LobbyHeader from '@/components/game/LobbyHeader.vue';
import Roster from '@/components/game/Roster.vue';
import RoundHistory from '@/components/game/RoundHistory.vue';
import VoicePanel from '@/components/game/VoicePanel.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameChannel } from '@/composables/useGameChannel';
import { useGameLabels } from '@/composables/useGameLabels';
import { useLobby } from '@/composables/useLobby';
import type { Emotion, Game } from '@/types/game';

const props = defineProps<{ game: Game }>();

const { t, isHost, canStart, busy, playerName, act, me } = useLobby(
    () => props.game,
);
const { emotions, emotionLevels } = useGameLabels();

const round = computed(() => props.game.emotion ?? null);
const answering = computed(() => props.game.status === 'active');
const result = computed(() =>
    props.game.status === 'completed' ? (round.value?.result ?? null) : null,
);
const level = computed(
    () => emotionLevels.value[props.game.emotion_level ?? 1].label,
);
const picksFor = (emotion: Emotion) =>
    (result.value?.answers ?? []).filter(
        (answer) => answer.emotion === emotion,
    );

useGameChannel(props.game.id);

function answer(emotion: Emotion) {
    act(`emotion/answer?emotion=${emotion}`);
}
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <LobbyHeader :game="game" :in-round="answering">
            <template #meta>
                <p class="mt-2 text-sm text-muted-foreground">
                    {{
                        t(':count / :max players', {
                            count: game.players.length,
                            max: game.max_players,
                        })
                    }}
                    · {{ t('Name the Emotion') }} · {{ level }}
                </p>
            </template>
            <template #actions>
                <template v-if="isHost">
                    <Button
                        v-if="!answering"
                        id="btn-start-emotion"
                        :disabled="busy || !canStart"
                        @click="act('emotion/start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Next face')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-else
                        id="btn-reveal-emotion"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'emotion/reveal',
                                t(
                                    'Show the answer now? Players who haven\'t picked yet will miss this face.',
                                ),
                            )
                        "
                    >
                        <Eye />
                        {{ t('Show the answer') }}
                    </Button>
                </template>
            </template>
        </LobbyHeader>

        <HostPanel v-if="isHost && game.status === 'recruiting'" :game="game" />

        <VoicePanel v-if="game.voice_enabled && me" :game="game" />

        <div
            v-if="round && game.status !== 'recruiting'"
            id="face-card"
            class="grid gap-4 rounded-xl border border-primary/60 bg-primary/5 p-4 md:grid-cols-[minmax(0,20rem)_1fr]"
        >
            <img
                id="face-image"
                :key="round.image_url"
                :src="round.image_url"
                :alt="t('A face showing an emotion')"
                class="aspect-square w-full max-w-80 rounded-lg bg-muted object-cover"
            />

            <div class="flex flex-col gap-3">
                <h2 class="flex items-center gap-2 font-semibold">
                    <Smile class="size-5" />
                    {{ t('Face :number', { number: round.number }) }}
                </h2>

                <template v-if="answering">
                    <p class="text-sm text-muted-foreground">
                        {{
                            t(
                                'Which emotion is this? :done of :total picked. You can change your pick until the answer is shown.',
                                {
                                    done: round.answered_user_ids.length,
                                    total: game.players.length,
                                },
                            )
                        }}
                    </p>
                    <div id="emotion-options" class="grid grid-cols-2 gap-2">
                        <Button
                            v-for="option in round.options"
                            :key="option"
                            :data-emotion="option"
                            :variant="
                                round.my_answer === option
                                    ? 'default'
                                    : 'outline'
                            "
                            :disabled="busy || !me"
                            @click="answer(option)"
                        >
                            {{ emotions[option] }}
                        </Button>
                    </div>
                </template>

                <div v-else-if="result" id="emotion-result" class="space-y-3">
                    <p class="text-lg font-bold">
                        {{
                            t('It was :emotion.', {
                                emotion: emotions[result.emotion],
                            })
                        }}
                        <span
                            v-if="round.my_answer"
                            id="my-verdict"
                            :class="
                                round.my_answer === result.emotion
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                            "
                        >
                            {{
                                round.my_answer === result.emotion
                                    ? t('You got it!')
                                    : t('You picked :emotion.', {
                                          emotion: emotions[round.my_answer],
                                      })
                            }}
                        </span>
                    </p>
                    <ul class="space-y-1 text-sm">
                        <li
                            v-for="option in round.options"
                            :key="option"
                            class="flex items-start gap-2"
                            :class="
                                option === result.emotion ? 'font-semibold' : ''
                            "
                        >
                            <Check
                                v-if="option === result.emotion"
                                class="mt-0.5 size-4 text-emerald-600"
                            />
                            <X v-else class="mt-0.5 size-4 opacity-30" />
                            <span>
                                {{ emotions[option] }}:
                                <span class="text-muted-foreground">{{
                                    picksFor(option)
                                        .map((pick) => playerName(pick.user_id))
                                        .join(', ') || '—'
                                }}</span>
                            </span>
                        </li>
                    </ul>
                    <p
                        v-if="result.hit_rate !== null"
                        id="face-hit-rate"
                        class="text-sm text-muted-foreground"
                    >
                        {{
                            t(
                                'Across all games, :percent% of :count answers named this face right.',
                                {
                                    percent: Math.round(result.hit_rate * 100),
                                    count: result.answers_so_far,
                                },
                            )
                        }}
                    </p>
                </div>
            </div>
        </div>

        <ChatPanel v-if="me" :game="game" />

        <Roster :game="game" :in-round="answering">
            <template #badge="{ player }">
                <Badge
                    v-if="
                        answering &&
                        round?.answered_user_ids.includes(player.user.id)
                    "
                    variant="outline"
                    >{{ t('picked') }}</Badge
                >
            </template>
        </Roster>

        <RoundHistory :game="game" />

        <FaceCredit />
    </div>
</template>
