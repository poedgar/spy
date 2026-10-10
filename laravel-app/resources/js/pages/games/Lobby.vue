<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { Play, Vote } from '@lucide/vue';
import { computed } from 'vue';
import HostPanel from '@/components/game/HostPanel.vue';
import LobbyHeader from '@/components/game/LobbyHeader.vue';
import LocationGuideDialog from '@/components/game/LocationGuideDialog.vue';
import RoleCard from '@/components/game/RoleCard.vue';
import Roster from '@/components/game/Roster.vue';
import RoundHistory from '@/components/game/RoundHistory.vue';
import RoundResults from '@/components/game/RoundResults.vue';
import VotingPanel from '@/components/game/VotingPanel.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameChannel } from '@/composables/useGameChannel';
import { useGameLabels } from '@/composables/useGameLabels';
import { useLobby } from '@/composables/useLobby';
import type { Categories, Game, Place } from '@/types/game';

const props = defineProps<{
    game: Game;
    locations: Place[];
    categories: Categories;
}>();

const { t, isHost, canStart } = useLobby(() => props.game);
const { modes, tiers } = useGameLabels();

const round = computed(() => props.game.round);
const inRound = computed(
    () => props.game.status === 'active' || props.game.status === 'voting',
);

useGameChannel(props.game.id);
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <LobbyHeader :game="game" :in-round="inRound">
            <template #meta>
                <p v-if="game.mission_briefing" class="mt-1 text-sm">
                    {{ game.mission_briefing }}
                </p>
                <p class="mt-2 text-sm text-muted-foreground">
                    {{
                        t(':count / :max operatives', {
                            count: game.players.length,
                            max: game.max_players,
                        })
                    }}
                    ·
                    {{
                        game.spy_count === 1
                            ? t('1 spy')
                            : t(':count spies', { count: game.spy_count })
                    }}
                    · {{ modes[game.game_mode].label }} ·
                    {{ tiers[game.age_tier].label }}
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
            <template #actions="{ busy, act }">
                <template v-if="isHost">
                    <Button
                        v-if="!inRound"
                        id="btn-start-round"
                        :disabled="busy || !canStart"
                        @click="act('start')"
                    >
                        <Play />
                        {{
                            game.status === 'completed'
                                ? t('Start next round')
                                : t('Start the game')
                        }}
                    </Button>
                    <Button
                        v-if="game.status === 'active'"
                        id="btn-start-voting"
                        :disabled="busy"
                        @click="act('voting')"
                    >
                        <Vote />
                        {{ t('Call a vote') }}
                    </Button>
                </template>
                <LocationGuideDialog
                    :locations="locations"
                    :categories="categories"
                />
            </template>
        </LobbyHeader>

        <HostPanel v-if="isHost && game.status === 'recruiting'" :game="game" />

        <RoleCard
            v-if="inRound && round"
            :key="round.number"
            :game="game"
            :round="round"
            :locations="locations"
            :categories="categories"
        />

        <VotingPanel
            v-if="game.status === 'voting' && round"
            :game="game"
            :round="round"
            :is-host="isHost"
        />

        <RoundResults
            v-if="game.status === 'completed' && round?.result"
            :game="game"
            :round="round"
            :result="round.result"
        />

        <Roster :game="game" :in-round="inRound">
            <template #badge="{ player }">
                <Badge
                    v-if="
                        game.status === 'voting' &&
                        round?.voted_user_ids.includes(player.user.id)
                    "
                    variant="outline"
                    >{{ t('voted') }}</Badge
                >
            </template>
        </Roster>

        <RoundHistory :game="game" />
    </div>
</template>
