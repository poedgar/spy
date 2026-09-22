<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('creating a game creates the game and the hosts game_players row', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the spy.',
    ]);

    $game = Game::where('title', 'Operation Nightfall')->firstOrFail();

    $response->assertRedirect(route('games.show', $game));
    expect($game->code)->toMatch('/^SPY-[A-Z0-9]{4}$/');
    expect(config('locations.names'))->toContain($game->secret_location);

    $hostRow = GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->firstOrFail();
    expect($hostRow->is_host)->toBeTrue();
    expect($hostRow->status)->toBe('ready');
});

test('a guest cannot create a game', function () {
    $response = $this->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the spy.',
    ]);

    $response->assertRedirect(route('login'));
});

test('creating a game validates required fields', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), []);

    $response->assertSessionHasErrors(['title', 'game_mode', 'max_players', 'mission_briefing']);
});
