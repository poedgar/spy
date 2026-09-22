<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('an authenticated player can view a games lobby', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    $response = $this->actingAs($host)->get(route('games.show', $game));

    $response->assertOk();
});

test('a guest is redirected to login when viewing a lobby', function () {
    $game = Game::factory()->create();

    $response = $this->get(route('games.show', $game));

    $response->assertRedirect(route('login'));
});

test('the lobby route resolves games by their invite code, not their numeric id', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'code' => 'SPY-TEST']);

    $response = $this->actingAs($host)->get('/games/SPY-TEST');

    $response->assertOk();
});
