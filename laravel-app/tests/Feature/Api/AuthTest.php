<?php

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

test('register creates a user with a codename and returns a token', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'device_name' => 'iPhone',
    ]);

    $response->assertCreated()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'codename', 'email']])
        ->assertJsonPath('user.email', 'ada@example.com');

    expect(User::where('email', 'ada@example.com')->first()->codename)->not->toBeEmpty();
});

test('register validates input', function () {
    $this->postJson('/api/v1/auth/register', ['device_name' => 'iPhone'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'password']);
});

test('login returns a token for valid credentials', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'Pixel',
    ])->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'codename']]);

    expect(PersonalAccessToken::where('name', 'Pixel')->count())->toBe(1);
});

test('login rejects a wrong password on the email field', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong',
        'device_name' => 'Pixel',
    ])->assertUnprocessable()->assertJsonValidationErrors(['email']);
});

test('me returns the authenticated user including email', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJson(['id' => $user->id, 'email' => $user->email, 'codename' => $user->codename]);
});

test('me requires a token', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('logout revokes the current token so it no longer authenticates', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PersonalAccessToken::count())->toBe(0);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
});
