<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a game player belongs to a game and a user', function () {
    $gamePlayer = GamePlayer::factory()->create();

    expect($gamePlayer->game)->toBeInstanceOf(Game::class)
        ->and($gamePlayer->user)->toBeInstanceOf(User::class);
});

test('a game has many players', function () {
    $game = Game::factory()->create();
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);

    expect($game->fresh()->players)->toHaveCount(3);
});

test('a user has many game_players rows', function () {
    $user = User::factory()->create();
    GamePlayer::factory()->count(2)->create(['user_id' => $user->id]);

    expect($user->fresh()->gamePlayers)->toHaveCount(2);
});

test('the same user cannot join the same game twice at the database level', function () {
    $game = Game::factory()->create();
    $user = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);
})->throws(QueryException::class);
