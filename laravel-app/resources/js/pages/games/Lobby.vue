<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

interface PlayerRow {
    id: number;
    is_host: boolean;
    status: string;
    score: number;
    user: {
        id: number;
        name: string;
        codename: string;
    };
}

interface GameProp {
    id: number;
    code: string;
    title: string;
    game_mode: string;
    max_players: number;
    mission_briefing: string;
    status: string;
    players: PlayerRow[];
}

defineProps<{
    game: GameProp;
}>();
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div id="lobby-header" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <p class="text-sm text-muted-foreground">
                Invite code: <span id="game-invite-code" class="font-mono font-bold">{{ game.code }}</span>
            </p>
            <h1 class="text-xl font-bold">{{ game.title }}</h1>
            <p class="text-sm text-muted-foreground">{{ game.players.length }} / {{ game.max_players }} operatives</p>
        </div>

        <div id="operatives-roster" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <h2 class="mb-2 font-semibold">Roster</h2>
            <ul id="roster-list" class="space-y-1">
                <li v-for="player in game.players" :key="player.id" class="flex items-center justify-between">
                    <span>
                        {{ player.user.codename }}
                        <span v-if="player.is_host" class="text-xs text-muted-foreground">(Host)</span>
                    </span>
                    <span class="text-xs text-muted-foreground">{{ player.score }} pts</span>
                </li>
            </ul>
        </div>
    </div>
</template>
