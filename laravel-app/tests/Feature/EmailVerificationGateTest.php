<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

function verificationLinkFor(User $user, int $minutes = 60): string
{
    return URL::temporarySignedRoute('email.verify.link', now()->addMinutes($minutes), [
        'id' => $user->id,
        'hash' => sha1($user->email),
    ]);
}

test('the emailed link points at the login-free route', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $user->sendEmailVerificationNotification();

    Notification::assertSentTo($user, VerifyEmail::class, function (VerifyEmail $notification) use ($user) {
        $url = $notification->toMail($user)->actionUrl;

        return str_contains($url, "/verify-email/{$user->id}/") && str_contains($url, 'signature=');
    });
});

test('the link verifies without being logged in, e.g. from a phone', function () {
    Event::fake([Verified::class]);
    $user = User::factory()->unverified()->create();

    $this->get(verificationLinkFor($user))
        ->assertRedirect(route('login'))
        ->assertSessionHas('status');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
});

test('opened while logged in, the link goes straight to the games', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->get(verificationLinkFor($user))->assertRedirect(route('dashboard'));
    // Each real request loads the user afresh.
    $this->actingAs($user->fresh())->get(route('dashboard'))->assertOk();
});

test('a tampered or expired link does nothing', function () {
    $user = User::factory()->unverified()->create();

    $this->get(str_replace(sha1($user->email), sha1('someone@else.test'), verificationLinkFor($user)))->assertForbidden();
    $this->get(verificationLinkFor($user, -1))->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('unverified players are kept out of games but can still fix their email', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->get(route('games.spy'))->assertRedirect(route('verification.notice'));
    $this->get(route('verification.notice'))->assertOk();
    $this->get(route('profile.edit'))->assertOk();
});

test('the app is told to verify first, and which account needs it', function () {
    $user = User::factory()->unverified()->create();
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/games/spy')
        ->assertStatus(409)
        ->assertJsonPath('code', 'email_unverified');
    $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('must_verify_email', true);
    $this->patchJson('/api/v1/me', ['name' => 'Still Allowed', 'email' => 'fixed-typo@example.com'])->assertOk();
    $this->postJson('/api/v1/me/email/verification-notification')->assertSuccessful();
});

test('verified players and switched-off verification play as before', function () {
    Sanctum::actingAs(User::factory()->create());
    $this->getJson('/api/v1/games/spy')->assertOk();
    $this->getJson('/api/v1/me')->assertJsonPath('must_verify_email', false);

    config(['app.require_verified_email' => false]);
    Sanctum::actingAs(User::factory()->unverified()->create());
    $this->getJson('/api/v1/games/spy')->assertOk();
});
