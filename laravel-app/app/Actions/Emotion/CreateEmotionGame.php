<?php

namespace App\Actions\Emotion;

use App\Enums\GameType;
use App\Enums\PlayerStatus;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateEmotionGame
{
    /**
     * @param  array<string, mixed>  $attributes  Expected keys: title, emotion_level, max_players
     */
    public function handle(User $host, array $attributes): Game
    {
        return DB::transaction(function () use ($host, $attributes) {
            $game = Game::create([
                ...$attributes,
                'code' => Game::generateUniqueCode(),
                'host_id' => $host->id,
                'game_type' => GameType::Emotion,
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
