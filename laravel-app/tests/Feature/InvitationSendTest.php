<?php

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('a host can send an invitation to a game', function () {
    Event::fake([InvitationSent::class]);

    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertRedirect();
    $invitation = Invitation::where('game_id', $game->id)->where('to_user_id', $invitee->id)->firstOrFail();
    expect($invitation->status)->toBe('pending')
        ->and($invitation->from_user_id)->toBe($host->id);

    Event::assertDispatched(InvitationSent::class, fn (InvitationSent $event) => $event->invitation->is($invitation));
});

test('re-inviting a previously declined user reactivates the same row instead of duplicating', function () {
    Event::fake([InvitationSent::class]);

    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    $invitee = User::factory()->create();
    $existing = Invitation::factory()->create([
        'game_id' => $game->id,
        'to_user_id' => $invitee->id,
        'status' => 'declined',
    ]);

    $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    expect(Invitation::where('game_id', $game->id)->where('to_user_id', $invitee->id)->count())->toBe(1);
    expect($existing->fresh()->status)->toBe('pending');
});

test('a host cannot invite themselves', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $host->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
    expect(Invitation::where('game_id', $game->id)->exists())->toBeFalse();
});

test('a non-host cannot send invitations for a game they do not host', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $notHost = User::factory()->create();
    $invitee = User::factory()->create();

    $response = $this->actingAs($notHost)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertForbidden();
});

test('invitations cannot be sent for a game that is not recruiting', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'status' => 'active']);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertForbidden();
});

test('cannot invite a user already in the game', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    $alreadyIn = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $alreadyIn->id]);

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $alreadyIn->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
});

test('cannot invite into a full game', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 1]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
    expect(Invitation::where('game_id', $game->id)->exists())->toBeFalse();
});

test('a broadcast failure does not prevent the invitation from being saved', function () {
    // phpunit.xml intentionally configures fake Pusher credentials (see M4
    // in the final review) — broadcasting to them always fails one way or
    // another (auth rejection, or a network/TLS error), which is exactly
    // the scenario this test exercises: store() must swallow that failure
    // and still save the invitation and redirect successfully.
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertRedirect();
    expect(Invitation::where('game_id', $game->id)->where('to_user_id', $invitee->id)->exists())->toBeTrue();
});

test('a guest is redirected to login when trying to send an invitation', function () {
    $game = Game::factory()->create();
    $invitee = User::factory()->create();

    $response = $this->post(route('invitations.store', $game), ['to_user_id' => $invitee->id]);

    $response->assertRedirect(route('login'));
});
