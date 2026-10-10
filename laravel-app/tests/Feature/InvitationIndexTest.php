<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

/**
 * A user who once played in another game with the host: the people a host
 * is offered without searching.
 */
function formerTeammate(User $host, array $attributes = []): User
{
    $user = User::factory()->create($attributes);
    $earlier = Game::factory()->create(['status' => 'completed']);
    GamePlayer::factory()->create(['game_id' => $earlier->id, 'user_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $earlier->id, 'user_id' => $user->id]);

    return $user;
}

test('the host sees the invite page listing other users', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $candidate = formerTeammate($host);
    User::factory()->create(); // a stranger stays hidden until searched for

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
    $alreadyIn = formerTeammate($host);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $alreadyIn->id]);
    $candidate = formerTeammate($host);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->has('users', 1)
        ->where('users.0.id', $candidate->id));
});

test('a user with a pending invitation is annotated as pending', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = formerTeammate($host);
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'to_user_id' => $invitee->id, 'status' => 'pending']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->where('users.0.invite_status', 'pending'));
});

test('a user with a declined invitation is annotated as invitable again', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = formerTeammate($host);
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

test('searching finds anyone by name or codename, and only past teammates show without one', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $teammate = formerTeammate($host, ['name' => 'Tess Teammate']);
    $stranger = User::factory()->create(['name' => 'Sam Stranger', 'codename' => 'QUIET_OTTER']);

    $this->actingAs($host)->get(route('invitations.index', $game))
        ->assertInertia(fn ($page) => $page->has('users', 1)->where('users.0.id', $teammate->id));

    // The full codename: random factory names can contain "otter" (Potter).
    $this->get(route('invitations.index', [$game, 'q' => 'quiet_otter']))
        ->assertInertia(fn ($page) => $page->has('users', 1)->where('users.0.id', $stranger->id)->where('search', 'quiet_otter'));

    // One character is too broad to search with.
    $this->get(route('invitations.index', [$game, 'q' => 's']))
        ->assertInertia(fn ($page) => $page->has('users', 1)->where('users.0.id', $teammate->id));
});
