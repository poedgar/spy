<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GamePlayer>
 */
class GamePlayerFactory extends Factory
{
    protected $model = GamePlayer::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'user_id' => User::factory(),
            'is_host' => false,
            'status' => 'ready',
            'score' => 0,
            'joined_at' => now(),
        ];
    }
}
