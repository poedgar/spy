<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { MapPin, Vote, VenetianMask } from '@lucide/vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useTrans } from '@/composables/useTrans';
import { dashboard, login, register } from '@/routes';

const { t } = useTrans();

const steps = [
    {
        icon: MapPin,
        title: 'Everyone gets the location',
        body: 'Every operative is told the same secret place, drawn from hundreds of locations.',
    },
    {
        icon: VenetianMask,
        title: 'Except the spies',
        body: 'One to four spies know only that they are spies. They must bluff their way through.',
    },
    {
        icon: Vote,
        title: 'Question, then vote',
        body: 'Ask each other questions, then vote out a suspect, unless a spy names the location first.',
    },
];
</script>

<template>
    <Head :title="t('Spy')" />
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
                    {{ t('Spy') }}
                </h1>
                <p class="mx-auto max-w-xl text-lg text-muted-foreground">
                    {{
                        t(
                            'A social deduction party game. Everyone knows where you are, except the spy.',
                        )
                    }}
                </p>
            </div>

            <ol class="grid gap-4 sm:grid-cols-3">
                <li
                    v-for="step in steps"
                    :key="step.title"
                    class="rounded-xl border p-5"
                >
                    <component
                        :is="step.icon"
                        class="mb-2 size-6 text-primary"
                    />
                    <h2 class="font-semibold">{{ t(step.title) }}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                        {{ t(step.body) }}
                    </p>
                </li>
            </ol>

            <div class="text-center">
                <Link
                    :href="$page.props.auth.user ? '/games/spy' : register()"
                    class="inline-block rounded-md bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
                >
                    {{ t('Start an operation') }}
                </Link>
            </div>
        </main>
    </div>
</template>
