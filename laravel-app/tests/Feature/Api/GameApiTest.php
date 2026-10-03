<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

const GAME_SHAPE = ['id', 'code', 'title', 'game_type', 'game_mode', 'max_players', 'mission_briefing', 'status', 'host_id', 'player_count', 'created_at'];

test('spy home lists my spy games and pending invitations', function () {
    $user = User::factory()->create();
    $game = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);
    Invitation::factory()->create(['to_user_id' => $user->id]);
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/games/spy')
        ->assertOk()
        ->assertJsonStructure([
            'games' => [GAME_SHAPE],
            'pending_invitations' => [['id', 'status', 'game_title', 'game_code', 'from_codename', 'created_at']],
        ])
        ->assertJsonMissingPath('games.0.secret_location');
});

test('creating a game returns the lobby', function () {
    $host = User::factory()->create();
    Sanctum::actingAs($host);

    $this->postJson('/api/v1/games', [
        'title' => 'Op Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole.',
    ])->assertCreated()
        ->assertJsonStructure([...GAME_SHAPE, 'host' => ['id', 'codename'], 'players' => [['id', 'user' => ['id', 'codename'], 'is_host', 'status', 'joined_at']]])
        ->assertJsonPath('player_count', 1)
        ->assertJsonMissingPath('secret_location');
});

test('creating a game validates input', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games', ['max_players' => 99])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'game_mode', 'max_players', 'mission_briefing']);
});

test('a member can view the lobby without leaking secrets or other players emails', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'secret_location' => 'Church']);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);
    Sanctum::actingAs($member);

    $response = $this->getJson("/api/v1/games/{$game->code}")->assertOk()->assertJsonPath('player_count', 2);

    expect($response->getContent())->not->toContain('Church')->not->toContain($host->email);
});

test('a non-member gets 403 on the lobby', function () {
    $game = Game::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->getJson("/api/v1/games/{$game->code}")->assertForbidden();
});

test('an unknown or lowercase code is 404 on lobby and join', function () {
    Game::factory()->create(['code' => 'SPY-ABCD']);
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/v1/games/SPY-ZZZZ')->assertNotFound();
    $this->postJson('/api/v1/games/spy-abcd/join')->assertNotFound();
});

test('joining returns the lobby and is idempotent', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson("/api/v1/games/{$game->code}/join")->assertOk()->assertJsonStructure(GAME_SHAPE);
    $this->postJson("/api/v1/games/{$game->code}/join")->assertOk();

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('joining a full game is a 422 on code', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/games/{$game->code}/join")
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This operation roster is already full.');
});

test('game endpoints require a token', function () {
    $this->getJson('/api/v1/games/spy')->assertUnauthorized();
    $this->postJson('/api/v1/games')->assertUnauthorized();
});
