<?php

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Enums\GameType;
use App\Enums\InvitationStatus;
use App\Events\InvitationSent;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use App\Queries\GameHomeQuery;
use App\Queries\InvitableUsersQuery;
use Illuminate\Support\Facades\Event;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * @param  array<string, mixed>  $attributes
 * @return array{0: User, 1: Game}
 */
function hostedGame(array $attributes = []): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    return [$host, $game];
}

function expectRuleViolation(callable $callback, string $field, string $message): void
{
    try {
        $callback();
        throw new Exception('Expected GameRuleException');
    } catch (GameRuleException $e) {
        expect($e->field)->toBe($field)->and($e->getMessage())->toBe($message);
    }
}

test('SendInvitation creates a pending invitation and dispatches InvitationSent', function () {
    Event::fake([InvitationSent::class]);
    [$host, $game] = hostedGame();
    $invitee = User::factory()->create();

    $invitation = app(SendInvitation::class)->handle($game, $host, $invitee->id);

    expect($invitation->status)->toBe(InvitationStatus::Pending);
    Event::assertDispatched(InvitationSent::class);
});

test('SendInvitation enforces every existing rule', function () {
    Event::fake([InvitationSent::class]);
    [$host, $game] = hostedGame(['max_players' => 2]);
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);

    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, $host->id), 'to_user_id', 'You cannot invite yourself.');
    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, $member->id), 'to_user_id', 'That operative is already in this operation.');
    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, User::factory()->create()->id), 'to_user_id', 'This operation roster is already full.');
});

test('SendInvitation aborts 403 for a non-host', function () {
    [, $game] = hostedGame();

    app(SendInvitation::class)->handle($game, User::factory()->create(), User::factory()->create()->id);
})->throws(HttpException::class);

test('AcceptInvitation joins the game and marks the invitation accepted', function () {
    [, $game] = hostedGame();
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $result = app(AcceptInvitation::class)->handle($invitation, $recipient);

    expect($result->is($game))->toBeTrue()
        ->and($invitation->fresh()->status)->toBe(InvitationStatus::Accepted)
        ->and(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeTrue();
});

test('AcceptInvitation rejects stale, non-recruiting and full cases', function () {
    [, $game] = hostedGame(['max_players' => 1]);
    $recipient = User::factory()->create();

    $declined = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id, 'status' => 'declined']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined, $recipient), 'invitation', 'This invitation is no longer available.');

    $declined->update(['status' => 'pending']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined, $recipient), 'invitation', 'This operation roster is already full.');

    $game->update(['status' => 'active']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined->fresh(), $recipient), 'invitation', 'This operation is no longer recruiting.');
});

test('AcceptInvitation aborts 403 for anyone but the recipient', function () {
    $invitation = Invitation::factory()->create();

    app(AcceptInvitation::class)->handle($invitation, User::factory()->create());
})->throws(HttpException::class);

test('DeclineInvitation marks a pending invitation declined', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    app(DeclineInvitation::class)->handle($invitation, $recipient);

    expect($invitation->fresh()->status)->toBe(InvitationStatus::Declined);
});

test('GameHomeQuery returns the users games of one type and pending invitations only', function () {
    [$host, $game] = hostedGame();
    $otherGame = Game::factory()->create(['game_type' => 'phrase']);
    GamePlayer::factory()->create(['game_id' => $otherGame->id, 'user_id' => $host->id]);
    Invitation::factory()->create(['to_user_id' => $host->id, 'status' => 'pending']);
    Invitation::factory()->create(['to_user_id' => $host->id, 'status' => 'declined']);

    $query = app(GameHomeQuery::class);

    expect($query->games($host)->pluck('id')->all())->toBe([$game->id])
        ->and($query->pendingInvitations($host))->toHaveCount(1)
        ->and($query->pendingInvitations($host)->first()->relationLoaded('fromUser'))->toBeTrue()
        ->and($query->games($host, GameType::Phrase)->pluck('id')->all())->toBe([$otherGame->id])
        ->and($query->pendingInvitations($host, GameType::Phrase))->toHaveCount(0);
});

test('InvitableUsersQuery excludes the host and roster and flags pending invitations', function () {
    [$host, $game] = hostedGame();
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);
    $invited = User::factory()->create(['name' => 'Alpha']);
    $free = User::factory()->create(['name' => 'Bravo']);
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'to_user_id' => $invited->id, 'status' => 'pending']);

    $rows = app(InvitableUsersQuery::class)->for($game, $host);

    expect($rows->pluck('id')->all())->toBe([$invited->id, $free->id])
        ->and($rows->firstWhere('id', $invited->id)['invite_status'])->toBe('pending')
        ->and($rows->firstWhere('id', $free->id)['invite_status'])->toBeNull();
});
