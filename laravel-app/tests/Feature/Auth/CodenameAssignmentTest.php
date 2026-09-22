<?php

use App\Models\User;

test('registration assigns a codename to the new user', function () {
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'operative@example.com')->firstOrFail();

    expect($user->codename)->not->toBeEmpty();
});

test('a freshly registered user can access the dashboard without verifying email', function () {
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative2@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});
