<?php

use App\Events\InvitationIssued;
use App\Events\RoundStarted;
use App\Listeners\NotifyInvitee;
use App\Listeners\NotifyRoundStarted;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\JoinRequest;
use App\Models\PushToken;
use App\Models\User;
use App\Notifications\BecameHost;
use App\Notifications\InvitationReceived;
use App\Notifications\JoinRequestAnsweredNotification;
use App\Notifications\RemovedFromGame;
use App\Notifications\RoundStartedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

function fakeExpo(array $tickets = [['status' => 'ok'], ['status' => 'ok']]): void
{
    Http::fake(['exp.host/*' => Http::response(['data' => $tickets])]);
}

// --- Who gets told what -------------------------------------------------------

test('the listeners are wired to their events and notifications are queued', function () {
    Event::fake();

    Event::assertListening(InvitationIssued::class, NotifyInvitee::class);
    Event::assertListening(RoundStarted::class, NotifyRoundStarted::class);
    expect(new RemovedFromGame(Game::factory()->create()))->toBeInstanceOf(ShouldQueue::class);
});

test('an invitation is stored, pushed to every device, and survives a broadcaster outage', function () {
    fakeExpo();
    // The test env points at a fake Pusher; the live channel must not break sending.
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[two]', 'platform' => 'android']);

    $invitation->toUser->notify(new InvitationReceived($invitation));

    $stored = $invitation->toUser->notifications()->sole();
    expect($stored->data)->toMatchArray([
        'kind' => 'invitation',
        'invitation_id' => $invitation->id,
        'game_code' => $invitation->game->code,
        'from_codename' => $invitation->fromUser->codename,
    ]);

    Http::assertSent(function ($request) use ($invitation) {
        $messages = $request->data();

        return count($messages) === 2
            && $messages[0]['to'] === 'ExponentPushToken[one]'
            && $messages[0]['title'] === 'New operation invite'
            && $messages[0]['body'] === "{$invitation->fromUser->codename} invited you to {$invitation->game->title}"
            && $messages[0]['data'] === ['type' => 'invitation', 'invitation_id' => $invitation->id, 'code' => $invitation->game->code, 'game_type' => 'spy'];
    });
});

test('pushes are written in the recipients language and sent with the Expo token', function () {
    fakeExpo();
    config(['services.expo.access_token' => 'expo-secret']);
    $invitation = Invitation::factory()->create();
    $invitation->toUser->update(['locale' => 'uk']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);

    $invitation->toUser->notify(new InvitationReceived($invitation));

    Http::assertSent(fn ($request) => $request->data()[0]['title'] === 'Нове запрошення до операції'
        && $request->hasHeader('Authorization', 'Bearer expo-secret'));
});

test('tokens Expo reports as DeviceNotRegistered are pruned', function () {
    fakeExpo([
        ['status' => 'error', 'details' => ['error' => 'DeviceNotRegistered']],
        ['status' => 'ok'],
    ]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[dead]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[live]', 'platform' => 'ios']);

    $invitation->toUser->notify(new InvitationReceived($invitation));

    expect(PushToken::pluck('token')->all())->toBe(['ExponentPushToken[live]']);
});

test('no devices means no push request, but the notification is still stored', function () {
    fakeExpo();
    $invitation = Invitation::factory()->create();

    $invitation->toUser->notify(new InvitationReceived($invitation));

    Http::assertNothingSent();
    expect($invitation->toUser->notifications()->count())->toBe(1);
});

test('a round start notifies every player but the host', function () {
    Notification::fake();
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $players = User::factory()->count(2)->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $players->each(fn (User $user) => GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]));

    app(NotifyRoundStarted::class)->handle(new RoundStarted($game, 2));

    Notification::assertSentTo($players, RoundStartedNotification::class);
    Notification::assertNotSentTo($host, RoundStartedNotification::class);
});

test('a declined join request is stored but not pushed', function () {
    fakeExpo();
    $game = Game::factory()->create();
    $player = User::factory()->create();
    PushToken::create(['user_id' => $player->id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);

    $player->notify(new JoinRequestAnsweredNotification($game, approved: false));

    Http::assertNothingSent();
    expect($player->notifications()->sole()->data['approved'])->toBeFalse();
});

test('removal and becoming host are notified by the lobby actions', function () {
    Notification::fake();
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true, 'joined_at' => now()->subMinute()]);
    [$keeper, $removed] = User::factory()->count(2)->create()->all();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $keeper->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $removed->id]);
    Sanctum::actingAs($host);

    $this->deleteJson("/api/v1/games/{$game->code}/players/{$removed->id}")->assertOk();
    Notification::assertSentTo($removed, RemovedFromGame::class);

    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();
    Notification::assertSentTo($keeper, BecameHost::class);
});

// --- Reading them -------------------------------------------------------------

test('the feed lists notifications newest first, presented in my language', function () {
    fakeExpo();
    $game = Game::factory()->create(['title' => 'Op Echo']);
    $me = User::factory()->create(['locale' => 'uk']);
    $me->notify(new RoundStartedNotification($game, 1));
    $this->travel(1)->minutes();
    $me->notify(new JoinRequestAnsweredNotification($game, approved: true));
    Sanctum::actingAs($me);

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('unread_count', 2)
        ->assertJsonPath('notifications.0.kind', 'join_answered')
        ->assertJsonPath('notifications.0.title', 'Вас впустили!')
        ->assertJsonPath('notifications.0.link', "/games/{$game->code}")
        ->assertJsonPath('notifications.1.kind', 'round_started')
        ->assertJsonPath('notifications.1.read_at', null);
});

test('notifications are marked read one at a time or all at once, only by their owner', function () {
    fakeExpo();
    $game = Game::factory()->create();
    $me = User::factory()->create();
    $me->notify(new RoundStartedNotification($game, 1));
    $me->notify(new BecameHost($game));
    [$first] = $me->notifications()->pluck('id')->all();

    Sanctum::actingAs(User::factory()->create());
    $this->postJson("/api/v1/notifications/{$first}/read")->assertNotFound();

    Sanctum::actingAs($me);
    $this->postJson("/api/v1/notifications/{$first}/read")->assertNoContent();
    expect($me->unreadNotifications()->count())->toBe(1);

    $this->postJson('/api/v1/notifications/read-all')->assertNoContent();
    expect($me->unreadNotifications()->count())->toBe(0);
});

test('on the web the bell is shared on every page and opening a notification follows it', function () {
    fakeExpo();
    $game = Game::factory()->create();
    $me = User::factory()->create();
    $me->notify(new BecameHost($game));
    $id = $me->notifications()->value('id');

    $this->actingAs($me)->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('notifications.unread_count', 1)
            ->where('notifications.notifications.0.kind', 'became_host'));

    $this->post(route('notifications.open', $id))->assertRedirect("/games/{$game->code}");
    expect($me->unreadNotifications()->count())->toBe(0);
});

test('accepting the request flow end to end leaves a notification for each side', function () {
    fakeExpo();
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $guest = User::factory()->create();

    Sanctum::actingAs($guest);
    $this->postJson("/api/v1/games/{$game->code}/join-requests")->assertCreated();
    expect($host->notifications()->sole()->data['kind'])->toBe('join_request');

    Sanctum::actingAs($host);
    $request = JoinRequest::sole();
    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request->id}/approve")->assertOk();

    expect($guest->notifications()->sole()->data)->toMatchArray(['kind' => 'join_answered', 'approved' => true]);
});

test('the bell does not depend on a queue worker', function () {
    config(['queue.default' => 'database']);
    $invitation = Invitation::factory()->create();

    $invitation->toUser->notify(new InvitationReceived($invitation));

    // Stored at once; push and mail wait for the worker.
    expect($invitation->toUser->notifications()->count())->toBe(1)
        ->and(DB::table('jobs')->count())->toBeGreaterThan(0);
});
