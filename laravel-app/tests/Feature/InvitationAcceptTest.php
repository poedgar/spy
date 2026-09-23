<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('accepting an invitation adds the user to the game and marks it accepted', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertRedirect(route('games.show', $game));
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeTrue();
    expect($invitation->fresh()->status)->toBe('accepted');
});

test('accepting an already-resolved invitation fails gracefully without duplicating', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create([
        'game_id' => $game->id,
        'to_user_id' => $recipient->id,
        'status' => 'declined',
    ]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertSessionHasErrors('invitation');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeFalse();
    expect($invitation->fresh()->status)->toBe('declined');
});

test('accepting into a game that filled up in the meantime fails gracefully', function () {
    $game = Game::factory()->create(['max_players' => 1]);
    $host = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertSessionHasErrors('invitation');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeFalse();
    expect($invitation->fresh()->status)->toBe('pending');
});

test('only the invitations recipient can accept it', function () {
    $game = Game::factory()->create();
    $recipient = User::factory()->create();
    $someoneElse = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($someoneElse)->post(route('invitations.accept', $invitation));

    $response->assertForbidden();
});

test('a guest is redirected to login when trying to accept', function () {
    $invitation = Invitation::factory()->create();

    $response = $this->post(route('invitations.accept', $invitation));

    $response->assertRedirect(route('login'));
});
