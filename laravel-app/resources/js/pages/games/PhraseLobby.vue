<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import {
    Eye,
    EyeOff,
    MessageCircleQuestion,
    Play,
    SearchX,
    Trophy,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import HostPanel from '@/components/game/HostPanel.vue';
import LobbyHeader from '@/components/game/LobbyHeader.vue';
import Roster from '@/components/game/Roster.vue';
import RoundHistory from '@/components/game/RoundHistory.vue';
import RoundTimer from '@/components/game/RoundTimer.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameChannel } from '@/composables/useGameChannel';
import { useLobby } from '@/composables/useLobby';
import type { Game } from '@/types/game';

const props = defineProps<{
    game: Game;
}>();

const { t, myId, isHost, canStart, busy, playerName, act } = useLobby(
    () => props.game,
);

const phrase = computed(() => props.game.phrase ?? null);
const active = computed(() => props.game.status === 'active');
const isAsker = computed(() => phrase.value?.asker_user_id === myId.value);
const nobodyGuessed = computed(
    () => phrase.value?.result && phrase.value.result.winner_user_id === null,
);

// Hidden by default so a neighbour can't read the word off the screen.
const revealed = ref(false);
const guessForm = useForm({ guess: '' });

useGameChannel(props.game.id);

function guess() {
    guessForm.post(`/games/${props.game.code}/phrase/guess`, {
        preserveScroll: true,
        onSuccess: () => guessForm.reset(),
    });
}
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <LobbyHeader :game="game" :in-round="active">
            <template #meta>
                <p class="mt-2 text-sm text-muted-foreground">
                    {{
                        t(':count / :max players', {
                            count: game.players.length,
                            max: game.max_players,
                        })
                    }}
                    ·
                    {{
                        game.phrase_language === 'uk'
                            ? t('Ukrainian phrases')
                            : t('English phrases')
                    }}
                    <template v-if="game.round_seconds">
                        ·
                        {{
                            t(':minutes min rounds', {
                                minutes: game.round_seconds / 60,
                            })
                        }}
                    </template>
                </p>
            </template>
            <template #actions>
                <template v-if="isHost">
                    <Button
                        v-if="!active"
                        id="btn-start-phrase"
                        :disabled="busy || !canStart"
                        @click="act('phrase/start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Deal the next phrase')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-if="active"
                        id="btn-reveal-phrase"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'phrase/reveal',
                                t(
                                    'Show everyone the phrase and end this round without points?',
                                ),
                            )
                        "
                    >
                        <SearchX />
                        {{ t('Reveal and end') }}
                    </Button>
                </template>
            </template>
        </LobbyHeader>

        <HostPanel v-if="isHost && game.status === 'recruiting'" :game="game" />

        <template v-if="active && phrase">
            <div
                id="word-card"
                class="rounded-xl border p-4"
                :class="
                    revealed
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-sidebar-border/70 dark:border-sidebar-border'
                "
            >
                <div class="flex items-center justify-between gap-2">
                    <span class="flex flex-wrap items-center gap-2">
                        <h2 class="font-semibold">
                            {{
                                t('Phrase :number · :count words', {
                                    number: phrase.number,
                                    count: phrase.word_count,
                                })
                            }}
                        </h2>
                        <RoundTimer
                            v-if="phrase.ends_at"
                            :ends-at="phrase.ends_at"
                        />
                    </span>
                    <Button
                        id="btn-reveal-word"
                        variant="outline"
                        size="sm"
                        @click="revealed = !revealed"
                    >
                        <component :is="revealed ? EyeOff : Eye" />
                        {{ revealed ? t('Hide my word') : t('Reveal my word') }}
                    </Button>
                </div>
                <p v-if="!revealed" class="mt-3 text-sm text-muted-foreground">
                    {{
                        t(
                            'Your word is hidden. Reveal it when nobody can see your screen.',
                        )
                    }}
                </p>
                <div v-else class="mt-3 space-y-1">
                    <p class="text-sm text-muted-foreground">
                        {{
                            t('Your word is number :position of :count', {
                                position: phrase.my_position ?? '?',
                                count: phrase.word_count,
                            })
                        }}
                    </p>
                    <p id="my-word" class="text-3xl font-bold">
                        {{ phrase.my_word }}
                    </p>
                </div>
            </div>

            <div
                id="turn-panel"
                class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
            >
                <h2 class="flex items-center gap-2 font-semibold">
                    <MessageCircleQuestion class="size-5" />
                    {{
                        t('Question round :number', {
                            number: phrase.question_round,
                        })
                    }}
                </h2>
                <p id="current-asker" class="mt-1">
                    {{
                        isAsker
                            ? t(
                                  'Your turn: ask another player a question about their word, out loud.',
                              )
                            : t(':player is asking a question.', {
                                  player: playerName(phrase.asker_user_id),
                              })
                    }}
                </p>
                <Button
                    v-if="isAsker || isHost"
                    id="btn-pass-turn"
                    class="mt-3"
                    variant="secondary"
                    :disabled="busy"
                    @click="act('phrase/turn')"
                >
                    {{
                        isAsker
                            ? t('Done, pass the turn')
                            : t('Skip to the next asker')
                    }}
                </Button>
            </div>

            <form
                id="guess-form"
                class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                @submit.prevent="guess"
            >
                <h2 class="font-semibold">{{ t('Know the phrase?') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'A right guess wins the game (+:win points). A wrong one costs :penalty point.',
                            {
                                win: phrase.scoring.win,
                                penalty: Math.abs(phrase.scoring.wrong_guess),
                            },
                        )
                    }}
                </p>
                <div class="mt-3 flex gap-2">
                    <Input
                        id="input-phrase-guess"
                        v-model="guessForm.guess"
                        :placeholder="t('Type the whole phrase')"
                        autocomplete="off"
                    />
                    <Button
                        id="btn-guess-phrase"
                        type="submit"
                        :disabled="
                            guessForm.processing || !guessForm.guess.trim()
                        "
                    >
                        {{ t('Guess') }}
                    </Button>
                </div>
                <p
                    v-if="guessForm.errors.guess"
                    class="mt-2 text-sm text-red-600"
                >
                    {{ guessForm.errors.guess }}
                </p>
            </form>
        </template>

        <div
            v-if="game.status === 'completed' && phrase?.result"
            id="phrase-results"
            class="rounded-xl border p-4"
            :class="
                nobodyGuessed
                    ? 'border-sidebar-border/70 dark:border-sidebar-border'
                    : 'border-emerald-500/60 bg-emerald-500/5'
            "
        >
            <h2 class="flex items-center gap-2 text-lg font-bold">
                <component
                    :is="nobodyGuessed ? SearchX : Trophy"
                    class="size-5"
                />
                <template v-if="!nobodyGuessed">
                    {{
                        t(':player guessed the phrase!', {
                            player: playerName(phrase.result.winner_user_id),
                        })
                    }}
                </template>
                <template v-else-if="phrase.result.ending === 'time_up'">
                    {{ t("Time's up! Nobody guessed the phrase.") }}
                </template>
                <template v-else>{{ t('Nobody guessed it') }}</template>
            </h2>
            <p id="revealed-phrase" class="mt-2 text-2xl font-semibold">
                “{{ phrase.result.phrase }}”
            </p>
            <ul class="mt-3 flex flex-wrap gap-2 text-sm">
                <li
                    v-for="word in phrase.result.words"
                    :key="word.position"
                    class="rounded-md border px-2 py-1"
                    :class="word.user_id ? 'border-primary/60' : 'opacity-60'"
                >
                    <span class="font-semibold">{{ word.word }}</span>
                    <span
                        v-if="word.user_id"
                        class="block text-xs text-muted-foreground"
                        >{{ playerName(word.user_id) }}</span
                    >
                    <span v-else class="block text-xs text-muted-foreground">{{
                        t('hidden')
                    }}</span>
                </li>
            </ul>
        </div>

        <div
            v-if="
                phrase &&
                phrase.guesses.length > 0 &&
                game.status !== 'recruiting'
            "
            id="guess-log"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">{{ t('Guesses') }}</h2>
            <ul class="space-y-1 text-sm">
                <li
                    v-for="(entry, index) in phrase.guesses"
                    :key="index"
                    :class="
                        entry.correct
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-muted-foreground line-through'
                    "
                >
                    {{ playerName(entry.user_id) }}: “{{ entry.guess }}”
                </li>
            </ul>
        </div>

        <Roster :game="game" :in-round="active">
            <template #badge="{ player }">
                <Badge
                    v-if="active && phrase?.asker_user_id === player.user.id"
                    variant="outline"
                    >{{ t('asking') }}</Badge
                >
            </template>
        </Roster>

        <RoundHistory :game="game" />
    </div>
</template>
