<?php

use App\Enums\InvitationStatus;
use App\Events\InvitationIssued;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->host = User::factory()->create();
    $this->game = Game::factory()->create(['host_id' => $this->host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $this->game->id, 'user_id' => $this->host->id, 'is_host' => true]);
});

test('the host lists invitable users: past teammates, or anyone matching a search', function () {
    $other = User::factory()->create();
    $earlier = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $earlier->id, 'user_id' => $this->host->id]);
    GamePlayer::factory()->create(['game_id' => $earlier->id, 'user_id' => $other->id]);
    $stranger = User::factory()->create(['codename' => 'LUNAR_HERON']);
    Sanctum::actingAs($this->host);

    $this->getJson("/api/v1/games/{$this->game->code}/invitable-users")
        ->assertOk()
        ->assertExactJson([['id' => $other->id, 'name' => $other->name, 'codename' => $other->codename, 'invite_status' => null]]);

    $this->getJson("/api/v1/games/{$this->game->code}/invitable-users?q=heron")
        ->assertOk()
        ->assertJsonPath('0.id', $stranger->id)
        ->assertJsonCount(1);
});

test('a non-host cannot list invitable users', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson("/api/v1/games/{$this->game->code}/invitable-users")->assertForbidden();
});

test('the host sends an invitation', function () {
    Event::fake([InvitationIssued::class]);
    $invitee = User::factory()->create();
    Sanctum::actingAs($this->host);

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $invitee->id])
        ->assertCreated()
        ->assertJson(['status' => 'pending', 'game_code' => $this->game->code, 'from_codename' => $this->host->codename]);

    Event::assertDispatched(InvitationIssued::class);
});

test('sending validates and enforces rules as 422', function () {
    Sanctum::actingAs($this->host);

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => 999999])
        ->assertUnprocessable()->assertJsonValidationErrors(['to_user_id']);
    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $this->host->id])
        ->assertUnprocessable()->assertJsonPath('errors.to_user_id.0', 'You cannot invite yourself.');
});

test('a non-host cannot send invitations', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $this->host->id])
        ->assertForbidden();
});

test('the recipient accepts and gets the lobby', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")
        ->assertOk()->assertJsonPath('code', $this->game->code)->assertJsonPath('player_count', 2);
});

test('accepting into a full game is a 422 on invitation', function () {
    $this->game->update(['max_players' => 1]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")
        ->assertUnprocessable()->assertJsonPath('errors.invitation.0', 'This operation roster is already full.');
});

test('the recipient declines', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/decline")->assertNoContent();

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Declined);
});

test('only the recipient can accept or decline', function () {
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")->assertForbidden();
    $this->postJson("/api/v1/invitations/{$invitation->id}/decline")->assertForbidden();
});
