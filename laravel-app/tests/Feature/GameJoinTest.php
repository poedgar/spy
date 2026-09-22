<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('a user can join an existing game', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', $game));

    $response->assertRedirect(route('games.show', $game));
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeTrue();
});

test('joining a game twice does not create a duplicate row', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('games.join', $game));
    $this->actingAs($user)->post(route('games.join', $game));

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('joining a full game is rejected', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', $game));

    $response->assertSessionHasErrors('code');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeFalse();
});

test('a guest is redirected to login when trying to join', function () {
    $game = Game::factory()->create();

    $response = $this->post(route('games.join', $game));

    $response->assertRedirect(route('login'));
});

test('joining with a nonexistent invite code returns a graceful error instead of a 404', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', ['code' => 'SPY-NOPE']));

    $response->assertSessionHasErrors('code');
    $response->assertStatus(302);
});

test('joining with a lowercase invite code fails gracefully since codes are case-sensitive', function () {
    $game = Game::factory()->create(['code' => 'SPY-ABCD', 'max_players' => 6]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', ['code' => 'spy-abcd']));

    $response->assertSessionHasErrors('code');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeFalse();
});
