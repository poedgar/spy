<?php

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\QueryException;

test('an invitation belongs to a game, a sender, and a recipient', function () {
    $invitation = Invitation::factory()->create();

    expect($invitation->game)->toBeInstanceOf(Game::class)
        ->and($invitation->fromUser)->toBeInstanceOf(User::class)
        ->and($invitation->toUser)->toBeInstanceOf(User::class);
});

test('an invitation defaults to pending status', function () {
    $invitation = Invitation::factory()->create();

    expect($invitation->status)->toBe('pending');
});

test('a game has many invitations', function () {
    $game = Game::factory()->create();
    Invitation::factory()->count(2)->create(['game_id' => $game->id]);

    expect($game->fresh()->invitations)->toHaveCount(2);
});

test('a user has many received invitations', function () {
    $user = User::factory()->create();
    Invitation::factory()->count(2)->create(['to_user_id' => $user->id]);

    expect($user->fresh()->receivedInvitations)->toHaveCount(2);
});

test('only one invitation row can exist per game and recipient', function () {
    $game = Game::factory()->create();
    $recipient = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);
})->throws(QueryException::class);
