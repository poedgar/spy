<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { useTrans } from '@/composables/useTrans';
import { dashboard } from '@/routes';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Games',
                href: dashboard(),
            },
        ],
    },
});

const { t } = useTrans();

const phraseRules = [
    'The host deals a well-known phrase in the chosen language. Every player secretly gets one of its words; the rest stay hidden.',
    'Players take turns asking someone else a question about their word, out loud. The app shows whose turn it is.',
    'Anyone can guess the whole phrase at any time. The first right guess wins 3 points; a wrong guess costs 1 point.',
];

const songRules = [
    'The host deals a short music clip; everyone hears the same one.',
    'Players take turns singing how it goes on, live at the table or in the lobby voice chat.',
    'After the last singer, everyone votes for the best performance (not their own). The most votes win a point.',
];

const finishRules = [
    'The host deals the beginning of a phrase; everyone gets the same one.',
    'Everyone writes their own ending: witty, absurd or wise. Nobody sees the others yet.',
    'The endings are shown without names, and everyone votes for the best (not their own). The most votes win a point.',
];

const meaningRules = [
    'The host deals an idiom or a saying; everyone gets the same one.',
    'Everyone writes what they think it means: serious, funny or creative.',
    'The interpretations are shown without names, and everyone votes for the best (not their own). The most votes win a point, and then you see what the phrase really means.',
];

const emotionRules = [
    'The host picks a level and shows a face; everyone sees the same one.',
    'Everyone secretly picks the emotion it shows: joy, sadness, anger, fear, surprise, disgust or neutral.',
    'When everyone has picked, the answer is shown. Each right pick wins a point.',
    'Easy shows clear expressions with 4 options, medium subtler ones with 6, hard the subtlest with all 7. Faces move between levels by how often players actually name them right.',
];

const rules = [
    'The host creates an operation and shares the invite code; 3 to 12 operatives can play.',
    'When the round starts, everyone secretly reveals their role. Loyal operatives see the location; spies do not.',
    'Take turns asking each other questions about the place. Answer so loyalists recognise you, but the spy learns nothing.',
    'When the host calls a vote, everyone votes for a suspect. The most-voted operative is accused; a tie lets the spies escape.',
    'At any moment a spy may guess the location. Right and the spies win the round; wrong and the loyalists do.',
    'Every operative on the winning side scores a point. Play as many rounds as you like.',
];
</script>

<template>
    <Head :title="t('Choose a Game')" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">{{ t('Choose a Game') }}</h1>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
                id="tile-spy"
                href="/games/spy"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Spy') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'A social-deduction party game. Find the mole before time runs out.',
                        )
                    }}
                </p>
            </Link>

            <Link
                id="tile-phrase"
                href="/games/phrase"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Phrase') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'Everyone holds one word of a famous phrase. Ask questions and be the first to guess it.',
                        )
                    }}
                </p>
            </Link>

            <Link
                id="tile-song"
                href="/games/song"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Sing It Out') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'Everyone hears the same music clip and sings how it goes on. Then vote for the best.',
                        )
                    }}
                </p>
            </Link>

            <Link
                id="tile-finish"
                href="/games/finish"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Finish the Phrase') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'Everyone gets the same beginning of a phrase and writes an ending. Then vote for the best, without knowing whose it is.',
                        )
                    }}
                </p>
            </Link>

            <Link
                id="tile-emotion"
                href="/games/emotion"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Name the Emotion') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'Everyone sees the same face and picks the emotion it shows. Three levels, from clear expressions to the subtlest.',
                        )
                    }}
                </p>
            </Link>

            <Link
                id="tile-meaning"
                href="/games/meaning"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">{{ t('Interpret the Phrase') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    {{
                        t(
                            'Everyone gets the same idiom and writes what it means. Vote for the best interpretation, then learn the real meaning.',
                        )
                    }}
                </p>
            </Link>
        </div>

        <section
            id="how-to-play"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="font-semibold">{{ t('How to play Spy') }}</h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in rules" :key="rule">{{ t(rule) }}</li>
            </ol>
            <h2 class="mt-4 font-semibold">{{ t('How to play Phrase') }}</h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in phraseRules" :key="rule">{{ t(rule) }}</li>
            </ol>
            <h2 class="mt-4 font-semibold">
                {{ t('How to play Sing It Out') }}
            </h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in songRules" :key="rule">{{ t(rule) }}</li>
            </ol>
            <h2 class="mt-4 font-semibold">
                {{ t('How to play Finish the Phrase') }}
            </h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in finishRules" :key="rule">{{ t(rule) }}</li>
            </ol>
            <h2 class="mt-4 font-semibold">
                {{ t('How to play Interpret the Phrase') }}
            </h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in meaningRules" :key="rule">{{ t(rule) }}</li>
            </ol>
            <h2 class="mt-4 font-semibold">
                {{ t('How to play Name the Emotion') }}
            </h2>
            <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li v-for="rule in emotionRules" :key="rule">{{ t(rule) }}</li>
            </ol>
        </section>
    </div>
</template>
