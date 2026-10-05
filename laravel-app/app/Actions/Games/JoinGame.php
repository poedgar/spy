<?php

namespace App\Actions\Games;

use App\Events\PlayerJoined;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class JoinGame
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): Game
    {
        if ($game->players()->where('user_id', $user->id)->exists()) {
            return $game;
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('code', 'This operation roster is already full.');
        }

        $player = GamePlayer::create([
            'game_id' => $game->id,
            'user_id' => $user->id,
            'is_host' => false,
            'status' => 'ready',
            'joined_at' => now(),
        ]);

        BestEffortBroadcast::dispatch(new PlayerJoined($player));

        return $game;
    }
}
