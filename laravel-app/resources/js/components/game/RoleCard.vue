<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { Eye, EyeOff, MapPin, ShieldCheck, VenetianMask } from '@lucide/vue';
import { computed, ref } from 'vue';
import LocationList from '@/components/game/LocationList.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useTrans } from '@/composables/useTrans';
import type { Categories, Game, Place, Round } from '@/types/game';

const props = defineProps<{
    game: Game;
    round: Round;
    locations: Place[];
    categories: Categories;
}>();

const { t, pick, locale } = useTrans();

// Hidden by default so a role is never on screen for a neighbour to read.
const revealed = ref(false);
const guessOpen = ref(false);
const guess = ref<Place | null>(null);
const guessing = ref(false);

const isSpy = computed(() => props.round.my_role === 'spy');
const otherLanguageName = computed(() =>
    props.round.location
        ? props.round.location[locale.value === 'uk' ? 'en' : 'uk']
        : '',
);

function submitGuess() {
    if (!guess.value) {
        return;
    }

    guessing.value = true;
    router.post(
        `/games/${props.game.code}/guess`,
        { location_id: guess.value.id },
        {
            preserveScroll: true,
            onFinish: () => {
                guessing.value = false;
                guessOpen.value = false;
            },
        },
    );
}
</script>

<template>
    <div
        id="role-card"
        class="rounded-xl border p-4"
        :class="
            revealed
                ? isSpy
                    ? 'border-red-500/60 bg-red-500/5'
                    : 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-sidebar-border/70 dark:border-sidebar-border'
        "
    >
        <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold">
                {{ t('Round :number', { number: round.number }) }} ·
                {{
                    round.spy_count === 1
                        ? t('1 spy at the table')
                        : t(':count spies at the table', {
                              count: round.spy_count,
                          })
                }}
            </h2>
            <Button
                id="btn-reveal-role"
                variant="outline"
                size="sm"
                @click="revealed = !revealed"
            >
                <component :is="revealed ? EyeOff : Eye" />
                {{ revealed ? t('Hide role') : t('Reveal my role') }}
            </Button>
        </div>

        <p v-if="!revealed" class="mt-3 text-sm text-muted-foreground">
            {{
                t(
                    'Your dossier is sealed. Reveal it when nobody can see your screen.',
                )
            }}
        </p>

        <div v-else-if="isSpy" id="role-spy" class="mt-3 space-y-3">
            <p
                class="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400"
            >
                <VenetianMask class="size-5" />
                {{ t('You are the spy') }}
            </p>
            <p class="text-sm">
                {{
                    t(
                        'You do not know the location. Blend in, listen for clues, and avoid being voted out.',
                    )
                }}
            </p>
            <p class="text-sm text-muted-foreground">
                {{
                    t(
                        'Think you know where you are? Name the location to win the round, but a wrong guess loses it.',
                    )
                }}
            </p>
            <Dialog v-model:open="guessOpen">
                <DialogTrigger as-child>
                    <Button
                        id="btn-guess-location"
                        variant="destructive"
                        size="sm"
                    >
                        <MapPin />
                        {{ t('Guess the location') }}
                    </Button>
                </DialogTrigger>
                <DialogContent class="flex max-h-[85vh] flex-col sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{{ t('Guess the location') }}</DialogTitle>
                        <DialogDescription>
                            {{
                                t(
                                    'You get one guess. Right and the spies win; wrong and the loyalists do.',
                                )
                            }}
                        </DialogDescription>
                    </DialogHeader>
                    <LocationList
                        :locations="locations"
                        :categories="categories"
                        selectable
                        :selected-id="guess?.id"
                        @select="guess = $event"
                    />
                    <DialogFooter>
                        <Button
                            id="btn-confirm-guess"
                            variant="destructive"
                            :disabled="!guess || guessing"
                            @click="submitGuess"
                        >
                            {{
                                guess
                                    ? t('Stake the round on :place', {
                                          place: pick(guess),
                                      })
                                    : t('Pick a location')
                            }}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div v-else id="role-loyalist" class="mt-3 space-y-2">
            <p
                class="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
            >
                <ShieldCheck class="size-5" />
                {{ t('You are a loyal operative') }}
            </p>
            <p class="flex items-baseline gap-2 text-2xl font-bold">
                <span id="secret-location">{{ pick(round.location) }}</span>
                <span class="text-sm font-normal text-muted-foreground"
                    >({{ otherLanguageName }})</span
                >
            </p>
            <p class="text-sm text-muted-foreground">
                {{
                    t(
                        'Ask and answer questions that prove you know this place without giving it away to the spy.',
                    )
                }}
            </p>
        </div>
    </div>
</template>
