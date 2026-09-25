<?php

use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('declining an invitation marks it declined without joining the game', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.decline', $invitation));

    $response->assertRedirect(route('games.spy'));
    expect($invitation->fresh()->status)->toBe('declined');
    expect(GamePlayer::where('game_id', $invitation->game_id)->where('user_id', $recipient->id)->exists())->toBeFalse();
});

test('declining an already-resolved invitation does not change an accepted status', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id, 'status' => 'accepted']);

    $this->actingAs($recipient)->post(route('invitations.decline', $invitation));

    expect($invitation->fresh()->status)->toBe('accepted');
});

test('only the invitations recipient can decline it', function () {
    $recipient = User::factory()->create();
    $someoneElse = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    $response = $this->actingAs($someoneElse)->post(route('invitations.decline', $invitation));

    $response->assertForbidden();
    expect($invitation->fresh()->status)->toBe('pending');
});

test('a guest is redirected to login when trying to decline', function () {
    $invitation = Invitation::factory()->create();

    $response = $this->post(route('invitations.decline', $invitation));

    $response->assertRedirect(route('login'));
});
