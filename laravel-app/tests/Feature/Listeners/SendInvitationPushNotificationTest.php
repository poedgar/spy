<?php

use App\Events\InvitationSent;
use App\Listeners\SendInvitationPushNotification;
use App\Models\Invitation;
use App\Models\PushToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

test('the listener is registered for InvitationSent and queued', function () {
    // Dispatching the real event here would also attempt a Pusher broadcast
    // with the fake test credentials, so assert the wiring directly.
    Event::fake();
    Event::assertListening(InvitationSent::class, SendInvitationPushNotification::class);

    expect(new SendInvitationPushNotification)->toBeInstanceOf(ShouldQueue::class);
});

test('it sends one Expo message per device with the invitation data', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'a'], ['status' => 'ok', 'id' => 'b']]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[two]', 'platform' => 'android']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    Http::assertSent(function ($request) use ($invitation) {
        $messages = $request->data();

        return $request->url() === 'https://exp.host/--/api/v2/push/send'
            && count($messages) === 2
            && $messages[0]['to'] === 'ExponentPushToken[one]'
            && $messages[0]['title'] === 'New operation invite'
            && $messages[0]['body'] === "{$invitation->fromUser->codename} invited you to {$invitation->game->title}"
            && $messages[0]['data'] === ['type' => 'invitation', 'invitation_id' => $invitation->id, 'code' => $invitation->game->code];
    });
});

test('it makes no request when the invitee has no devices', function () {
    Http::fake();

    app(SendInvitationPushNotification::class)->handle(new InvitationSent(Invitation::factory()->create()));

    Http::assertNothingSent();
});

test('it deletes tokens Expo reports as DeviceNotRegistered', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [
        ['status' => 'error', 'message' => 'gone', 'details' => ['error' => 'DeviceNotRegistered']],
        ['status' => 'ok', 'id' => 'b'],
    ]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[dead]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[live]', 'platform' => 'ios']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    expect(PushToken::pluck('token')->all())->toBe(['ExponentPushToken[live]']);
});

test('it sends the Expo access token when configured', function () {
    config(['services.expo.access_token' => 'expo-secret']);
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'a']]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer expo-secret'));
});
