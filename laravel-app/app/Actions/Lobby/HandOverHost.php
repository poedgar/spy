<?php

namespace App\Actions\Lobby;

use App\Models\Game;
use App\Models\GamePlayer;

/**
 * Makes another player the host. Runs inside the caller's transaction, with
 * the game row locked.
 */
class HandOverHost
{
    /**
     * Picks the longest-standing other player, or returns null when nobody
     * else is left to take over.
     */
    public function toNextPlayer(Game $game, int $leavingUserId): ?int
    {
        $next = $game->players()->where('user_id', '!=', $leavingUserId)->first();

        if ($next === null) {
            return null;
        }

        $this->to($game, $next->user_id);

        return $next->user_id;
    }

    public function to(Game $game, int $userId): void
    {
        GamePlayer::where('game_id', $game->id)->update(['is_host' => false]);
        GamePlayer::where('game_id', $game->id)->where('user_id', $userId)->update(['is_host' => true]);
        $game->update(['host_id' => $userId]);
    }
}
