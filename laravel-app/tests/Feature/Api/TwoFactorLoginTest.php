<?php

use App\Models\User;
use Laravel\Fortify\TwoFactorAuthenticationProvider;
use Laravel\Sanctum\PersonalAccessToken;

function startChallenge(User $user): string
{
    return test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'iPhone',
    ])->assertOk()->assertJson(['two_factor' => true])->json('challenge');
}

test('login for a 2FA user returns a challenge and no token', function () {
    $user = User::factory()->withTwoFactor()->create();

    $challenge = startChallenge($user);

    expect($challenge)->toBeString()->toHaveLength(40)
        ->and(PersonalAccessToken::count())->toBe(0);
});

test('a valid TOTP code completes the challenge', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)
        ->shouldReceive('verify')->with('secret', '123456')->andReturn(true);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'code' => '123456'])
        ->assertOk()->assertJsonStructure(['token', 'user']);

    expect(PersonalAccessToken::where('name', 'iPhone')->count())->toBe(1);
});

test('a wrong TOTP code is rejected', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)
        ->shouldReceive('verify')->andReturn(false);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'code' => '000000'])
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('a recovery code completes the challenge once and cannot be reused', function () {
    $user = User::factory()->withTwoFactor()->create();

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'recovery_code' => 'recovery-code-1'])
        ->assertOk();

    expect($user->fresh()->recoveryCodes())->not->toContain('recovery-code-1');

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'recovery_code' => 'recovery-code-1'])
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('an unknown challenge is rejected', function () {
    $this->postJson('/api/v1/auth/two-factor', ['challenge' => str_repeat('x', 40), 'code' => '123456'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});

test('an expired challenge is rejected', function () {
    $user = User::factory()->withTwoFactor()->create();
    $challenge = startChallenge($user);

    $this->travel(6)->minutes();

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'recovery_code' => 'recovery-code-1'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});

test('a challenge cannot be used twice', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)->shouldReceive('verify')->andReturn(true);
    $challenge = startChallenge($user);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => '123456'])->assertOk();
    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => '123456'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});
