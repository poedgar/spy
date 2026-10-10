<?php

use App\Actions\DeleteUser;
use App\Actions\Invitations\SendInvitation;
use App\Enums\GameStatus;
use App\Enums\InvitationStatus;
use App\Events\InvitationIssued;
use App\Events\JoinRequestDecided;
use App\Events\JoinRequested;
use App\Listeners\NotifyHostOfJoinRequest;
use App\Listeners\NotifyInvitee;
use App\Listeners\NotifyJoinRequester;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\JoinRequest;
use App\Models\User;
use App\Notifications\BecameHost;
use App\Notifications\Channels\BestEffortMailChannel;
use App\Notifications\GameClosed;
use App\Notifications\InvitationReceived;
use App\Queries\GameHomeQuery;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;

/**
 * @return array{0: Game, 1: User, 2: list<User>}
 */
function lobby(int $count, array $attributes = []): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true, 'joined_at' => now()->subMinutes(10)]);

    $others = User::factory()->count($count - 1)->create()->values()->each(
        fn (User $user, int $index) => GamePlayer::factory()->create([
            'game_id' => $game->id,
            'user_id' => $user->id,
            'joined_at' => now()->subMinutes(9 - $index),
        ]),
    );

    return [$game, $host, [$host, ...$others->all()]];
}

// --- Hosts (item 9) ---------------------------------------------------------

test('a leaving host hands the game to the longest-standing player', function () {
    [$game, $host, $players] = lobby(3);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();

    $game->refresh();
    expect($game->host_id)->toBe($players[1]->id)
        ->and($game->hasPlayer($host))->toBeFalse()
        ->and(GamePlayer::where('game_id', $game->id)->where('is_host', true)->pluck('user_id')->all())->toBe([$players[1]->id]);
});

test('the last player out closes the game', function () {
    [$game, $host] = lobby(1);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();

    expect(Game::find($game->id))->toBeNull();
});

test('the host removes a player between rounds, never mid-round', function () {
    [$game, $host, $players] = lobby(4);
    Sanctum::actingAs($host);

    $this->deleteJson("/api/v1/games/{$game->code}/players/{$players[2]->id}")
        ->assertOk()
        ->assertJsonCount(3, 'players');
    $this->deleteJson("/api/v1/games/{$game->code}/players/{$host->id}")->assertUnprocessable();

    $game->update(['status' => GameStatus::Active]);
    $this->deleteJson("/api/v1/games/{$game->code}/players/{$players[1]->id}")->assertUnprocessable();

    Sanctum::actingAs($players[1]);
    $this->deleteJson("/api/v1/games/{$game->code}/players/{$players[3]->id}")->assertForbidden();
});

test('the host hands hosting to another player', function () {
    [$game, $host, $players] = lobby(3);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/host", ['user_id' => $players[2]->id])
        ->assertOk()
        ->assertJsonPath('host_id', $players[2]->id);
    $this->postJson("/api/v1/games/{$game->code}/host", ['user_id' => $players[1]->id])->assertForbidden();

    Sanctum::actingAs($players[2]);
    $this->postJson("/api/v1/games/{$game->code}/host", ['user_id' => User::factory()->create()->id])->assertUnprocessable();
});

test('deleting an account hands its games over instead of deleting them', function () {
    [$game, $host, $players] = lobby(3, ['status' => 'active']);
    $game->rounds()->create(['number' => 1, 'location_id' => 1, 'spy_user_ids' => [$players[1]->id], 'started_at' => now()]);
    [$solo, $soloHost] = lobby(1);
    $soloHost->delete(); // irrelevant owner, keeps the next line honest

    app(DeleteUser::class)->handle($host);

    $game->refresh();
    expect($game->host_id)->toBe($players[1]->id)
        ->and($game->status)->toBe(GameStatus::Recruiting)
        ->and($game->currentRound()->first()->ended_at)->not->toBeNull();
});

// --- Asking to join (item 5) --------------------------------------------------

test('with approval on, a code join becomes a request the host answers', function () {
    Event::fake([JoinRequested::class, JoinRequestDecided::class]);
    [$game, $host] = lobby(2, ['requires_approval' => true]);
    $guest = User::factory()->create();

    Sanctum::actingAs($guest);
    $this->postJson("/api/v1/games/{$game->code}/join")
        ->assertStatus(202)
        ->assertJsonPath('status', 'requested')
        ->assertJsonPath('code', $game->code);
    expect($game->hasPlayer($guest))->toBeFalse();
    Event::assertDispatched(JoinRequested::class);

    Sanctum::actingAs($host);
    $request = $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('requires_approval', true)
        ->assertJsonPath('join_requests.0.user.id', $guest->id)
        ->json('join_requests.0.id');

    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request}/approve")
        ->assertOk()
        ->assertJsonCount(0, 'join_requests')
        ->assertJsonCount(3, 'players');
    Event::assertDispatched(JoinRequestDecided::class, fn ($event) => $event->approved);

    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request}/decline")->assertUnprocessable();
});

test('a declined request keeps the player out, and only the host sees requests', function () {
    [$game, $host, $players] = lobby(2, ['requires_approval' => true]);
    $guest = User::factory()->create();
    $request = JoinRequest::create(['game_id' => $game->id, 'user_id' => $guest->id]);

    Sanctum::actingAs($players[1]);
    $this->getJson("/api/v1/games/{$game->code}")->assertJsonMissingPath('join_requests');
    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request->id}/approve")->assertForbidden();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request->id}/decline")->assertOk();

    expect($request->fresh()->status)->toBe(InvitationStatus::Declined)
        ->and($game->hasPlayer($guest))->toBeFalse();
});

test('invited players skip the approval queue', function () {
    [$game, $host] = lobby(2, ['requires_approval' => true]);
    $invitee = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'to_user_id' => $invitee->id]);

    Sanctum::actingAs($invitee);
    $this->postJson("/api/v1/games/{$game->code}/join")->assertOk()->assertJsonPath('player_count', 3);
});

test('the host turns approval on and off', function () {
    [$game, $host, $players] = lobby(2);

    $this->actingAs($host)->post(route('games.settings', $game), ['requires_approval' => true])->assertRedirect();
    expect($game->fresh()->requires_approval)->toBeTrue();

    $this->actingAs($players[1])->post(route('games.settings', $game), ['requires_approval' => false])->assertForbidden();
});

test('on the web a request sends you back with a confirmation', function () {
    [$game] = lobby(2, ['requires_approval' => true]);

    $this->actingAs(User::factory()->create())
        ->from(route('games.spy'))
        ->post(route('games.join', $game))
        ->assertRedirect(route('games.spy'));

    expect(JoinRequest::where('game_id', $game->id)->count())->toBe(1);
});

test('join attempts are rate limited', function () {
    $user = User::factory()->create();
    RateLimiter::clear('join');
    Sanctum::actingAs($user);

    foreach (range(1, 20) as $attempt) {
        $this->postJson('/api/v1/games/SPY-ZZZZ/join')->assertNotFound();
    }

    $this->postJson('/api/v1/games/SPY-ZZZZ/join')->assertTooManyRequests();
});

test('the host is notified about requests, the player about the answer', function () {
    Event::fake();

    Event::assertListening(JoinRequested::class, NotifyHostOfJoinRequest::class);
    Event::assertListening(JoinRequestDecided::class, NotifyJoinRequester::class);
});

// --- Outstanding invitations (item 6) -----------------------------------------

test('the host sees invitations that were not taken up, and can cancel or resend them', function () {
    Event::fake([InvitationIssued::class]);
    [$game, $host] = lobby(2);
    $pending = Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id]);
    $declined = Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'status' => 'declined']);
    Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id, 'status' => 'accepted']);

    Sanctum::actingAs($host);
    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonCount(2, 'invitations')
        ->assertJsonPath('invitations.1.status', 'declined');

    $this->deleteJson("/api/v1/games/{$game->code}/invitations/{$pending->id}")
        ->assertOk()
        ->assertJsonCount(1, 'invitations');

    // Re-inviting reuses the row and notifies the player again.
    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => $declined->to_user_id])->assertCreated();
    expect($declined->fresh()->status)->toBe(InvitationStatus::Pending);
    Event::assertDispatched(InvitationIssued::class);
});

// --- Invitation email (item 7) --------------------------------------------------

test('invitees are emailed unless they turned emails off', function () {
    Notification::fake();
    $invitation = Invitation::factory()->create();

    app(NotifyInvitee::class)->handle(new InvitationIssued($invitation));
    Notification::assertSentTo($invitation->toUser, InvitationReceived::class, fn ($notification, $channels) => in_array(BestEffortMailChannel::class, $channels, true));

    $muted = Invitation::factory()->create();
    $muted->toUser->update(['email_notifications' => false]);
    app(NotifyInvitee::class)->handle(new InvitationIssued($muted));
    Notification::assertSentTo($muted->toUser, InvitationReceived::class, fn ($notification, $channels) => ! in_array(BestEffortMailChannel::class, $channels, true));
});

test('the invitation email is written in the invitees language', function () {
    $invitation = Invitation::factory()->create();
    $invitation->toUser->update(['locale' => 'uk']);

    // The notification sender switches to the notifiable's preferred locale.
    expect($invitation->toUser->preferredLocale())->toBe('uk');
    App::setLocale('uk');
    $mail = (new InvitationReceived($invitation))->toMail($invitation->toUser);

    expect($mail->subject)->toContain('запрошує вас')
        ->and($mail->actionUrl)->toBe(url('/games/spy'));
});

// --- Codenames (item 8) ---------------------------------------------------------

test('players choose their own unique codename', function () {
    $user = User::factory()->create();
    $taken = User::factory()->create(['codename' => 'NIGHT_OWL']);
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'codename' => '  silver fox '])
        ->assertOk()
        ->assertJsonPath('codename', 'SILVER_FOX');

    $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'codename' => 'night owl'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('codename');
    $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'codename' => 'x!'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('codename');

    expect($taken->fresh()->codename)->toBe('NIGHT_OWL');
});

test('email notifications can be switched off in the profile', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'email_notifications' => false])
        ->assertOk()
        ->assertJsonPath('email_notifications', false);
});

test('new accounts get a codename nobody else has', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'New Agent',
        'email' => 'new@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'device_name' => 'phone',
    ])->assertCreated();

    $codename = User::where('email', 'new@example.com')->value('codename');
    expect(User::where('codename', $codename)->count())->toBe(1);
});

test('a pending invitation cannot be resent within the cooldown, and invites are rate limited', function () {
    [$game, $host] = lobby(1);
    $invitee = User::factory()->create();
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => $invitee->id])->assertCreated();
    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => $invitee->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('to_user_id');

    $this->travel(SendInvitation::RESEND_COOLDOWN_MINUTES + 1)->minutes();
    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => $invitee->id])->assertCreated();

    // That was the first of 10 allowed this minute.
    foreach (range(1, 9) as $attempt) {
        $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => User::factory()->create()->id]);
    }
    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => User::factory()->create()->id])
        ->assertTooManyRequests();
});

test('invitation emails only go to verified addresses', function () {
    Notification::fake();
    $invitation = Invitation::factory()->create();
    $invitation->toUser->forceFill(['email_verified_at' => null])->save();

    app(NotifyInvitee::class)->handle(new InvitationIssued($invitation));

    Notification::assertSentTo($invitation->toUser, InvitationReceived::class, fn ($notification, $channels) => ! in_array(BestEffortMailChannel::class, $channels, true));
});

test('signing up or changing your email sends a verification link', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Verify Me',
        'email' => 'verify@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'device_name' => 'phone',
    ])->assertCreated()->assertJsonPath('user.email_verified', false);
    $user = User::where('email', 'verify@example.com')->sole();
    Notification::assertSentTo($user, VerifyEmail::class);

    $verified = User::factory()->create();
    Sanctum::actingAs($verified);
    $this->patchJson('/api/v1/me', ['name' => $verified->name, 'email' => 'new-address@example.com'])->assertOk();
    expect($verified->fresh()->hasVerifiedEmail())->toBeFalse();
    Notification::assertSentTo($verified, VerifyEmail::class);

    Sanctum::actingAs($user);
    $this->postJson('/api/v1/me/email/verification-notification')->assertNoContent();
    Notification::assertSentToTimes($user, VerifyEmail::class, 2);
});

test('the host closes a game; players are told and a stale lobby goes home', function () {
    Notification::fake();
    [$game, $host, $players] = lobby(3);

    Sanctum::actingAs($players[1]);
    $this->deleteJson("/api/v1/games/{$game->code}")->assertForbidden();

    Sanctum::actingAs($host);
    $this->deleteJson("/api/v1/games/{$game->code}")->assertNoContent();

    expect(Game::find($game->id))->toBeNull();
    Notification::assertSentTo([$players[1], $players[2]], GameClosed::class);
    Notification::assertNotSentTo($host, GameClosed::class);

    $this->actingAs($players[1])->get(route('games.show', ['code' => $game->code]))->assertRedirect(route('dashboard'));
});

test('stale recruiting games drop out of open games, activity brings them back', function () {
    $game = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $game->host_id, 'is_host' => true]);
    Sanctum::actingAs(User::factory()->create());

    $this->travel(GameHomeQuery::OPEN_GAMES_STALE_HOURS + 1)->hours();
    $this->getJson('/api/v1/games/spy')->assertJsonCount(0, 'open_games');

    GamePlayer::factory()->create(['game_id' => $game->id]); // someone joins: activity
    $this->getJson('/api/v1/games/spy')->assertJsonCount(1, 'open_games');
});

test('old data is pruned daily', function () {
    $stale = Game::factory()->create();
    $fresh = Game::factory()->create();
    $user = User::factory()->create();
    $user->notify(new BecameHost($fresh));
    $user->notifications()->update(['read_at' => now(), 'created_at' => now()->subDays(61)]);
    Game::whereKey($stale->id)->update(['updated_at' => now()->subDays(91)]);

    $this->artisan('app:prune-old-data')->assertSuccessful();

    expect(Game::find($stale->id))->toBeNull()
        ->and(Game::find($fresh->id))->not->toBeNull()
        ->and($user->notifications()->count())->toBe(0);
});

test('mobile sign-ins expire', function () {
    expect(config('sanctum.expiration'))->toBe(60 * 24 * 90);
});
