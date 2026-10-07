<?php

namespace App\Actions\Games;

use App\Enums\PlayerStatus;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateGame
{
    /**
     * @param  array<string, mixed>  $attributes  Expected keys: title, game_mode, age_tier, max_players, mission_briefing
     */
    public function handle(User $host, array $attributes): Game
    {
        return DB::transaction(function () use ($host, $attributes) {
            $game = Game::create([
                ...$attributes,
                'code' => Game::generateUniqueCode(),
                'host_id' => $host->id,
                'game_type' => 'spy',
            ]);

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $host->id,
                'is_host' => true,
                'status' => PlayerStatus::Ready,
                'joined_at' => now(),
            ]);

            return $game;
        });
    }
}
