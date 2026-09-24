<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('the host sees the invite page listing other users', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $candidate = User::factory()->create();

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('games/InviteUsers')
        ->has('users', 1)
        ->where('users.0.id', $candidate->id)
        ->where('users.0.invite_status', null));
});

test('the current user and existing roster members are excluded from the candidate list', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $alreadyIn = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $alreadyIn->id]);
    $candidate = User::factory()->create();

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->has('users', 1)
        ->where('users.0.id', $candidate->id));
});

test('a user with a pending invitation is annotated as pending', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'to_user_id' => $invitee->id, 'status' => 'pending']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->where('users.0.invite_status', 'pending'));
});

test('a user with a declined invitation is annotated as invitable again', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'to_user_id' => $invitee->id, 'status' => 'declined']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->where('users.0.invite_status', null));
});

test('a non-host cannot view the invite page for a game they do not host', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $notHost = User::factory()->create();

    $response = $this->actingAs($notHost)->get(route('invitations.index', $game));

    $response->assertForbidden();
});

test('the invite page is unavailable once the game is no longer recruiting', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'status' => 'active']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertForbidden();
});

test('a guest is redirected to login when trying to view the invite page', function () {
    $game = Game::factory()->create();

    $response = $this->get(route('invitations.index', $game));

    $response->assertRedirect(route('login'));
});
