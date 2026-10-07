<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3';
import { Check, Vote } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/composables/useTrans';
import type { Game, Round } from '@/types/game';

const props = defineProps<{
    game: Game;
    round: Round;
    isHost: boolean;
}>();

const { t } = useTrans();
const page = usePage<{ auth: { user: { id: number } } }>();
const submitting = ref(false);

const myId = computed(() => page.props.auth.user.id);
const suspects = computed(() =>
    props.game.players.filter((player) => player.user.id !== myId.value),
);

function post(url: string, data: Record<string, number> = {}) {
    submitting.value = true;
    router.post(url, data, {
        preserveScroll: true,
        onFinish: () => (submitting.value = false),
    });
}

const vote = (suspectId: number) =>
    post(`/games/${props.game.code}/votes`, { suspect_id: suspectId });
const closeVoting = () => post(`/games/${props.game.code}/tally`);
</script>

<template>
    <div
        id="voting-panel"
        class="rounded-xl border border-amber-500/60 bg-amber-500/5 p-4"
    >
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-semibold">
                <Vote class="size-5" />
                {{ t('Who is the spy?') }}
            </h2>
            <span class="text-sm text-muted-foreground">
                {{
                    t(':voted of :total votes cast', {
                        voted: round.voted_user_ids.length,
                        total: game.players.length,
                    })
                }}
            </span>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
            {{
                t(
                    'Vote for the operative you suspect. You can change your vote until voting closes; it closes on its own once everyone has voted.',
                )
            }}
        </p>
        <p
            v-if="page.props.errors.suspect_id"
            class="mt-2 text-sm text-red-600"
        >
            {{ page.props.errors.suspect_id }}
        </p>

        <ul class="mt-3 grid gap-2 sm:grid-cols-2">
            <li v-for="player in suspects" :key="player.id">
                <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:border-primary disabled:opacity-60"
                    :class="
                        round.my_vote === player.user.id
                            ? 'border-primary bg-primary/10'
                            : ''
                    "
                    :disabled="submitting"
                    :data-suspect="player.user.codename"
                    @click="vote(player.user.id)"
                >
                    <span
                        >{{ player.user.codename }}
                        <span class="text-muted-foreground"
                            >({{ player.user.name }})</span
                        ></span
                    >
                    <Check
                        v-if="round.my_vote === player.user.id"
                        class="size-4 text-primary"
                    />
                </button>
            </li>
        </ul>

        <div v-if="isHost" class="mt-4">
            <Button
                id="btn-close-voting"
                variant="secondary"
                :disabled="submitting"
                @click="closeVoting"
            >
                {{ t('Close voting and reveal') }}
            </Button>
        </div>
    </div>
</template>
