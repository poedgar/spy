<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameLabels } from '@/composables/useGameLabels';
import { useTrans } from '@/composables/useTrans';
import type { OpenGame } from '@/types/game';

defineProps<{ games: OpenGame[] }>();

const { t } = useTrans();
const { modes, tiers } = useGameLabels();
const busyCode = ref<string | null>(null);

function send(method: 'post' | 'delete', game: OpenGame) {
    busyCode.value = game.code;
    router[method](
        method === 'post'
            ? `/games/${game.code}/join-requests`
            : `/games/${game.code}/join-requests/mine`,
        {},
        { preserveScroll: true, onFinish: () => (busyCode.value = null) },
    );
}

function details(game: OpenGame): string {
    if (game.game_type === 'phrase') {
        return game.phrase_language === 'uk'
            ? t('Ukrainian phrases')
            : t('English phrases');
    }

    return [
        game.game_mode ? modes.value[game.game_mode].label : null,
        tiers.value[game.age_tier].label,
    ]
        .filter(Boolean)
        .join(' · ');
}
</script>

<template>
    <div
        id="open-games"
        class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
    >
        <h2 class="font-semibold">{{ t('Open games') }}</h2>
        <p class="mb-2 text-sm text-muted-foreground">
            {{
                t(
                    'Games looking for players. Ask to join and the host decides.',
                )
            }}
        </p>
        <p v-if="games.length === 0" class="text-sm text-muted-foreground">
            {{
                t(
                    'No open games right now. Create one and others can find it here.',
                )
            }}
        </p>
        <ul class="divide-y">
            <li
                v-for="game in games"
                :key="game.id"
                class="flex flex-wrap items-center justify-between gap-2 py-2"
                :data-open-game="game.code"
            >
                <span>
                    <span class="font-medium">{{ game.title }}</span>
                    <span class="block text-sm text-muted-foreground">
                        {{ t('Host') }}: {{ game.host_codename }} ·
                        {{
                            t(':count / :max players', {
                                count: game.player_count,
                                max: game.max_players,
                            })
                        }}
                        · {{ details(game) }}
                    </span>
                </span>
                <span class="flex items-center gap-2">
                    <template v-if="game.my_request === 'pending'">
                        <Badge variant="secondary">{{ t('Requested') }}</Badge>
                        <Button
                            size="sm"
                            variant="ghost"
                            data-action="cancel-request"
                            :disabled="busyCode === game.code"
                            @click="send('delete', game)"
                        >
                            {{ t('Cancel request') }}
                        </Button>
                    </template>
                    <template v-else>
                        <Badge
                            v-if="game.my_request === 'declined'"
                            variant="outline"
                            >{{ t('declined') }}</Badge
                        >
                        <Button
                            size="sm"
                            data-action="request-join"
                            :disabled="busyCode === game.code"
                            @click="send('post', game)"
                        >
                            {{
                                game.my_request === 'declined'
                                    ? t('Ask again')
                                    : t('Ask to join')
                            }}
                        </Button>
                    </template>
                </span>
            </li>
        </ul>
    </div>
</template>
