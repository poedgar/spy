<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GameRound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameRound>
 */
class GameRoundFactory extends Factory
{
    protected $model = GameRound::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'number' => 1,
            'location_id' => 1,
            'spy_user_ids' => [],
            'started_at' => now(),
        ];
    }
}
