<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { MessageSquareQuote, VenetianMask } from '@lucide/vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useTrans } from '@/composables/useTrans';
import { dashboard, login, register } from '@/routes';

const { t } = useTrans();

const games = [
    {
        id: 'spy',
        icon: VenetianMask,
        name: 'Spy',
        intro: 'A social deduction party game. Everyone knows where you are, except the spy.',
        steps: [
            'Every operative is told the same secret place, drawn from hundreds of locations.',
            'One to four spies know only that they are spies. They must bluff their way through.',
            'Ask each other questions, then vote out a suspect, unless a spy names the location first.',
        ],
        play: 'Play Spy',
        path: '/games/spy',
    },
    {
        id: 'phrase',
        icon: MessageSquareQuote,
        name: 'Phrase',
        intro: 'Everyone holds one word of a famous phrase. Ask questions and be the first to guess it.',
        steps: [
            'Each player secretly gets one word of a famous phrase.',
            'Take turns asking each other about your words, out loud.',
            'Be the first to guess the whole phrase. A wrong guess costs a point.',
        ],
        play: 'Play Phrase',
        path: '/games/phrase',
    },
];
</script>

<template>
    <Head :title="t('Marvelous Games')" />
    <div
        class="flex min-h-screen flex-col items-center bg-background p-6 text-foreground lg:p-8"
    >
        <header
            class="flex w-full max-w-4xl items-center justify-between gap-4 text-sm"
        >
            <LanguageSwitcher />
            <nav class="flex items-center gap-2">
                <Link
                    v-if="$page.props.auth.user"
                    :href="dashboard()"
                    class="rounded-md border px-4 py-1.5 hover:border-primary"
                >
                    {{ t('Games') }}
                </Link>
                <template v-else>
                    <Link
                        :href="login()"
                        class="rounded-md px-4 py-1.5 hover:underline"
                    >
                        {{ t('Log in') }}
                    </Link>
                    <Link
                        :href="register()"
                        class="rounded-md border px-4 py-1.5 hover:border-primary"
                    >
                        {{ t('Register') }}
                    </Link>
                </template>
            </nav>
        </header>

        <main
            class="flex w-full max-w-4xl flex-1 flex-col justify-center gap-10 py-12"
        >
            <div class="space-y-3 text-center">
                <h1 class="text-4xl font-bold tracking-tight">
                    {{ t('Marvelous Games') }}
                </h1>
                <p class="mx-auto max-w-xl text-lg text-muted-foreground">
                    {{
                        t(
                            'Party games for friends: gather around, open it on your phones and play.',
                        )
                    }}
                </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
                <section
                    v-for="game in games"
                    :id="`welcome-${game.id}`"
                    :key="game.id"
                    class="flex flex-col rounded-xl border p-6"
                >
                    <h2 class="flex items-center gap-2 text-xl font-semibold">
                        <component
                            :is="game.icon"
                            class="size-6 text-primary"
                        />
                        {{ t(game.name) }}
                    </h2>
                    <p class="mt-2 text-muted-foreground">
                        {{ t(game.intro) }}
                    </p>
                    <ol class="mt-4 flex-1 list-decimal space-y-2 pl-5 text-sm">
                        <li v-for="step in game.steps" :key="step">
                            {{ t(step) }}
                        </li>
                    </ol>
                    <!-- Guests sign up first; players go straight to the game. -->
                    <Link
                        :href="$page.props.auth.user ? game.path : register()"
                        class="mt-6 inline-block self-start rounded-md bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        {{ t(game.play) }}
                    </Link>
                </section>
            </div>
        </main>
    </div>
</template>
