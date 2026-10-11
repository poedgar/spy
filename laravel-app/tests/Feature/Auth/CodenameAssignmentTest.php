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

test('a freshly registered user must verify their email before playing', function () {
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative2@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->get(route('dashboard'))->assertRedirect(route('verification.notice'));
});

test('with verification switched off, a new user plays straight away', function () {
    config(['app.require_verified_email' => false]);
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative3@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->get(route('dashboard'))->assertOk();
});
