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

            <div
                v-for="n in 1"
                :key="n"
                class="tile-coming-soon rounded-xl border border-dashed border-sidebar-border/70 p-4 opacity-50 dark:border-sidebar-border"
                aria-disabled="true"
            >
                <h2 class="font-semibold">{{ t('Coming Soon') }}</h2>
            </div>
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
        </section>
    </div>
</template>
