<?php

use App\Models\PushToken;
use App\Models\User;

const EXPO_TOKEN = 'ExponentPushToken[abc123]';

test('a device registers its push token against the current access token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('iPhone');

    $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'ios'])
        ->assertNoContent();

    $row = PushToken::sole();
    expect($row->user_id)->toBe($user->id)
        ->and($row->personal_access_token_id)->toBe($token->accessToken->id)
        ->and($row->platform)->toBe('ios');
});

test('registering validates token format and platform', function () {
    $token = User::factory()->create()->createToken('x')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/me/push-tokens', ['token' => 'nope', 'platform' => 'web'])
        ->assertUnprocessable()->assertJsonValidationErrors(['token', 'platform']);
});

test('a token registered by a second account on a shared device is reassigned, not duplicated', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();

    $this->withToken($first->createToken('a')->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'android'])->assertNoContent();
    $this->app['auth']->forgetGuards();
    $this->withToken($second->createToken('b')->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'android'])->assertNoContent();

    expect(PushToken::sole()->user_id)->toBe($second->id);
});

test('a user deletes their own push token but not someone elses', function () {
    $owner = User::factory()->create();
    PushToken::create(['user_id' => $owner->id, 'token' => EXPO_TOKEN, 'platform' => 'ios']);
    $intruder = User::factory()->create();

    $this->withToken($intruder->createToken('x')->plainTextToken)
        ->deleteJson('/api/v1/me/push-tokens/'.urlencode(EXPO_TOKEN))->assertNoContent();
    expect(PushToken::count())->toBe(1);

    $this->app['auth']->forgetGuards();
    $this->withToken($owner->createToken('y')->plainTextToken)
        ->deleteJson('/api/v1/me/push-tokens/'.urlencode(EXPO_TOKEN))->assertNoContent();
    expect(PushToken::count())->toBe(0);
});

test('logging out removes that devices push token', function () {
    $user = User::factory()->create();
    $plain = $user->createToken('iPhone')->plainTextToken;
    $this->withToken($plain)->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'ios']);

    $this->withToken($plain)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PushToken::count())->toBe(0);
});
