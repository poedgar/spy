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

test('the lobby payload does not leak player emails, email verification timestamps, or the secret location', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'secret_location' => 'Church']);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    $recruit = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $recruit->id]);

    $response = $this->actingAs($host)->get(route('games.show', $game));

    $response->assertOk();

    $props = $response->viewData('page')['props'];

    // The recruit is not the authenticated viewer, so their email must never
    // appear anywhere in the payload (not even via a shared/auth prop).
    $fullPayload = json_encode($props);
    expect($fullPayload)->not->toContain($recruit->email);

    // The `game` prop specifically (as opposed to Inertia's shared `auth.user`,
    // which legitimately carries the *viewer's own* email) must carry no PII
    // or the still-secret location for anyone, including the host.
    $gamePayload = json_encode($props['game']);

    expect($gamePayload)
        ->not->toContain($host->email)
        ->not->toContain($recruit->email)
        ->not->toContain('email_verified_at')
        ->not->toContain('secret_location')
        ->not->toContain($game->secret_location);

    expect($props['game']['players'][0]['user'])
        ->toHaveKeys(['id', 'name', 'codename'])
        ->not->toHaveKey('email');

    expect($props['game']['host'])
        ->toHaveKeys(['id', 'name', 'codename'])
        ->not->toHaveKey('email');
});
