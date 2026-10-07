<?php

namespace App\Actions\Games;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class CreateGame
{
    /**
     * @param  array<string, mixed>  $attributes  Expected keys: title, game_mode, max_players, mission_briefing
     */
    public function handle(User $host, array $attributes): Game
    {
        return DB::transaction(function () use ($host, $attributes) {
            $game = Game::create([
                ...$attributes,
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
                'host_id' => $host->id,
                'game_type' => 'spy',
            ]);

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $host->id,
                'is_host' => true,
                'status' => 'ready',
                'joined_at' => now(),
            ]);

            return $game;
        });
    }
}
