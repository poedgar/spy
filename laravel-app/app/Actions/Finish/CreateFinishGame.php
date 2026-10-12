<?php

namespace App\Actions\Finish;

use App\Enums\GameType;
use App\Enums\PlayerStatus;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateFinishGame
{
    /**
     * @param  array<string, mixed>  $attributes  Expected keys: title, phrase_language, max_players
     */
    public function handle(User $host, array $attributes, GameType $type = GameType::Finish): Game
    {
        abort_unless($type->isWritten(), 422);

        return DB::transaction(function () use ($host, $attributes, $type) {
            $game = Game::create([
                ...$attributes,
                'code' => Game::generateUniqueCode(),
                'host_id' => $host->id,
                'game_type' => $type,
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
