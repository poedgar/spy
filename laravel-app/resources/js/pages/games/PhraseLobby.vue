<script setup lang="ts">
import { Head, Link, router, useForm, usePage } from '@inertiajs/vue3';
import {
    Check,
    Copy,
    Eye,
    EyeOff,
    LogOut,
    MessageCircleQuestion,
    Play,
    RotateCcw,
    Trophy,
    UserPlus,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import HostPanel from '@/components/game/HostPanel.vue';
import PlayerActions from '@/components/game/PlayerActions.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameChannel } from '@/composables/useGameChannel';
import { useTrans } from '@/composables/useTrans';
import type { Game } from '@/types/game';

const props = defineProps<{
    game: Game;
}>();

const { t } = useTrans();
const page = usePage<{
    auth: { user: { id: number } };
    errors: Record<string, string>;
}>();

const myId = computed(() => page.props.auth.user.id);
const isHost = computed(() => myId.value === props.game.host.id);
const me = computed(() =>
    props.game.players.find((player) => player.user.id === myId.value),
);
const phrase = computed(() => props.game.phrase ?? null);
const active = computed(() => props.game.status === 'active');
const canStart = computed(
    () => props.game.players.length >= props.game.min_players,
);
const isAsker = computed(() => phrase.value?.asker_user_id === myId.value);
const scoreboard = computed(() =>
    [...props.game.players].sort((a, b) => b.score - a.score),
);

/** Codenames can repeat, so the name tells players apart. */
const playerName = (userId: number | null) => {
    const user = props.game.players.find(
        (player) => player.user.id === userId,
    )?.user;

    return user ? `${user.codename} (${user.name})` : t('a departed player');
};

const statusLabels = computed<Record<Game['status'], string>>(() => ({
    recruiting: t('Recruiting'),
    active: t('Round in progress'),
    voting: t('Voting'),
    completed: t('Round over'),
}));

const busy = ref(false);
const copied = ref(false);
// Hidden by default so a neighbour can't read the word off the screen.
const revealed = ref(false);
const guessForm = useForm({ guess: '' });

useGameChannel(props.game.id);

function act(path: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
        return;
    }

    busy.value = true;
    router.post(
        `/games/${props.game.code}/${path}`,
        {},
        { preserveScroll: true, onFinish: () => (busy.value = false) },
    );
}

function guess() {
    guessForm.post(`/games/${props.game.code}/phrase/guess`, {
        preserveScroll: true,
        onSuccess: () => guessForm.reset(),
    });
}

async function copyInvite() {
    const link = `${window.location.origin}/games/phrase?join=${props.game.code}`;

    try {
        await navigator.clipboard.writeText(link);
    } catch {
        window.prompt(t('Copy this invite link:'), link);
    }

    copied.value = true;
    window.setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div
            id="lobby-header"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-muted-foreground">
                    {{ t('Invite code:') }}
                    <span id="game-invite-code" class="font-mono font-bold">{{
                        game.code
                    }}</span>
                    <Button
                        id="btn-copy-invite"
                        variant="ghost"
                        size="icon-sm"
                        :title="t('Copy invite link')"
                        @click="copyInvite"
                    >
                        <component :is="copied ? Check : Copy" />
                    </Button>
                </p>
                <Badge id="game-status" variant="secondary">{{
                    statusLabels[game.status]
                }}</Badge>
            </div>
            <h1 class="text-xl font-bold">{{ game.title }}</h1>
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
            </p>

            <p v-if="page.props.errors.game" class="mt-2 text-sm text-red-600">
                {{ page.props.errors.game }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
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
                        v-if="game.status !== 'recruiting'"
                        id="btn-reset-game"
                        variant="outline"
                        :disabled="busy"
                        @click="
                            act(
                                'reset',
                                active
                                    ? t(
                                          'End this phrase without scoring and reopen recruiting?',
                                      )
                                    : undefined,
                            )
                        "
                    >
                        <RotateCcw />
                        {{ t('Back to recruiting') }}
                    </Button>
                    <Link
                        v-if="game.status === 'recruiting'"
                        id="btn-invite-players"
                        :href="`/games/${game.code}/invite`"
                        class="inline-flex items-center gap-1 self-center text-sm text-primary underline underline-offset-4"
                    >
                        <UserPlus class="size-4" />
                        {{ t('Invite Players') }}
                    </Link>
                </template>
                <Button
                    v-if="!active"
                    id="btn-leave-game"
                    variant="outline"
                    :disabled="busy"
                    @click="
                        act(
                            'leave',
                            isHost
                                ? t(
                                      'Leave? Hosting passes to the next player, or the game closes if nobody is left.',
                                  )
                                : t('Leave this game?'),
                        )
                    "
                >
                    <LogOut />
                    {{ t('Leave') }}
                </Button>
            </div>
            <p
                v-if="isHost && !active && !canStart"
                class="mt-2 text-sm text-muted-foreground"
            >
                {{
                    t('At least :count players are required to start.', {
                        count: game.min_players,
                    })
                }}
            </p>
            <p
                v-else-if="!isHost && game.status === 'recruiting'"
                class="mt-2 text-sm text-muted-foreground"
            >
                {{ t('Waiting for the host to start the game…') }}
            </p>
        </div>

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
                    <h2 class="font-semibold">
                        {{
                            t('Phrase :number · :count words', {
                                number: phrase.number,
                                count: phrase.word_count,
                            })
                        }}
                    </h2>
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
            class="rounded-xl border border-emerald-500/60 bg-emerald-500/5 p-4"
        >
            <h2 class="flex items-center gap-2 text-lg font-bold">
                <Trophy class="size-5" />
                {{
                    t(':player guessed the phrase!', {
                        player: playerName(phrase.result.winner_user_id),
                    })
                }}
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

        <div
            id="operatives-roster"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <div class="mb-2 flex items-center justify-between gap-2">
                <h2 class="font-semibold">{{ t('Players') }}</h2>
                <Button
                    v-if="me && !active"
                    id="btn-toggle-ready"
                    variant="outline"
                    size="sm"
                    :disabled="busy"
                    @click="act('ready')"
                >
                    {{
                        me.status === 'ready'
                            ? t('Mark me not ready')
                            : t('Mark me ready')
                    }}
                </Button>
            </div>
            <ul id="roster-list" class="space-y-1">
                <li
                    v-for="player in scoreboard"
                    :key="player.id"
                    class="flex items-center justify-between gap-2"
                >
                    <span class="flex items-center gap-2">
                        <span
                            :class="[
                                'inline-block h-2 w-2 rounded-full',
                                player.status === 'ready'
                                    ? 'bg-green-500'
                                    : 'bg-muted-foreground/40',
                            ]"
                        />
                        {{ player.user.codename }}
                        <span class="text-sm text-muted-foreground">{{
                            player.user.name
                        }}</span>
                        <span
                            v-if="player.is_host"
                            class="text-xs text-muted-foreground"
                            >({{ t('Host') }})</span
                        >
                        <Badge
                            v-if="
                                active &&
                                phrase?.asker_user_id === player.user.id
                            "
                            variant="outline"
                            >{{ t('asking') }}</Badge
                        >
                    </span>
                    <span class="flex items-center gap-2">
                        <PlayerActions
                            v-if="isHost && !active && player.user.id !== myId"
                            :code="game.code"
                            :player="player.user"
                        />
                        <span class="text-xs text-muted-foreground">{{
                            t(':score pts', { score: player.score })
                        }}</span>
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>
