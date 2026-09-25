<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    protected $model = Game::class;

    public function definition(): array
    {
        return [
            'code' => Game::generateUniqueCode(),
            'game_type' => 'spy',
            'title' => 'Operation '.fake()->word(),
            'game_mode' => 'mole',
            'host_id' => User::factory(),
            'max_players' => 6,
            'mission_briefing' => 'A rogue operative has intercepted intelligence files.',
            'secret_location' => 'Church',
            'status' => 'recruiting',
        ];
    }
}
