<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invitation>
 */
class InvitationFactory extends Factory
{
    protected $model = Invitation::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'status' => 'pending',
        ];
    }
}
