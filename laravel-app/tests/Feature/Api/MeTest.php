<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('profile can be updated', function () {
    $this->withToken($this->token)->patchJson('/api/v1/me', ['name' => 'New Name', 'email' => 'new@example.com'])
        ->assertOk()->assertJson(['name' => 'New Name', 'email' => 'new@example.com']);
});

test('profile update rejects an email taken by someone else', function () {
    $other = User::factory()->create();

    $this->withToken($this->token)->patchJson('/api/v1/me', ['name' => 'X', 'email' => $other->email])
        ->assertUnprocessable()->assertJsonValidationErrors(['email']);
});

test('password can be changed with the current password', function () {
    $this->withToken($this->token)->putJson('/api/v1/me/password', [
        'current_password' => 'password',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertNoContent();

    expect(Hash::check('new-password', $this->user->fresh()->password))->toBeTrue();
});

test('password change requires the correct current password', function () {
    $this->withToken($this->token)->putJson('/api/v1/me/password', [
        'current_password' => 'wrong',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertUnprocessable()->assertJsonValidationErrors(['current_password']);
});

test('account deletion requires the correct password', function () {
    $this->withToken($this->token)->deleteJson('/api/v1/me', ['password' => 'wrong'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);

    expect($this->user->fresh())->not->toBeNull();
});

test('account deletion removes the user and all their tokens', function () {
    $this->user->createToken('other-device');

    $this->withToken($this->token)->deleteJson('/api/v1/me', ['password' => 'password'])->assertNoContent();

    expect(User::find($this->user->id))->toBeNull()
        ->and(PersonalAccessToken::count())->toBe(0);
});
