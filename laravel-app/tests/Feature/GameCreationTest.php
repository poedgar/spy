<?php

use App\Enums\AgeTier;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PlayerStatus;
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
    expect($game->age_tier)->toBe(AgeTier::Adults);
    expect($game->status)->toBe(GameStatus::Recruiting);

    $hostRow = GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->firstOrFail();
    expect($hostRow->is_host)->toBeTrue();
    expect($hostRow->status)->toBe(PlayerStatus::Ready);
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

    $response->assertSessionHasErrors(['title', 'game_mode', 'max_players']);
    $response->assertSessionDoesntHaveErrors('mission_briefing');
});

test('the mission briefing is optional', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('games.store'), [
        'title' => 'No Briefing',
        'game_mode' => 'mole',
        'age_tier' => 'adults',
        'max_players' => 5,
        'mission_briefing' => '',
    ])->assertSessionHasNoErrors();

    expect(Game::where('title', 'No Briefing')->sole()->mission_briefing)->toBeNull();
});

test('creating a game sets its game_type to spy', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole before time runs out.',
    ]);

    $response->assertRedirect();
    $game = Game::where('title', 'Operation Nightfall')->firstOrFail();
    expect($game->game_type)->toBe(GameType::Spy);
});
