<?php

use App\Http\Controllers\Admin\UserController;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('only administrators can see the users page', function () {
    $this->get(route('admin.users.index'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())->get(route('admin.users.index'))->assertForbidden();

    $this->actingAs(User::factory()->create(['is_admin' => true]))->get(route('admin.users.index'))->assertOk();
});

test('admins see every account with how it signs in and how active it is', function () {
    $admin = User::factory()->create(['is_admin' => true, 'name' => 'Root']);
    $player = User::factory()->unverified()->create(['name' => 'Ada', 'last_seen_at' => now()->subMinute()]);
    $player->forceFill(['firebase_uid' => 'g-1'])->save();
    GamePlayer::factory()->create(['game_id' => Game::factory()->create(['host_id' => $admin->id])->id, 'user_id' => $player->id]);

    $this->actingAs($admin)->get(route('admin.users.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/Users')
            ->where('stats.total', 2)
            ->where('stats.verified', 1)
            ->where('stats.online', 1)
            ->where('users.data.0.name', 'Ada')
            ->where('users.data.0.verified', false)
            ->where('users.data.0.google', true)
            ->where('users.data.0.games_count', 1)
            ->where('users.data.0.online', true)
            ->where('users.data.1.admin', true)
            ->missing('users.data.0.password')
            ->missing('users.data.0.firebase_uid'));
});

test('admins can search and page through accounts', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    User::factory()->create(['email' => 'find.me@example.com']);
    User::factory()->count(UserController::PER_PAGE + 3)->create();

    $this->actingAs($admin)->get(route('admin.users.index', ['q' => 'FIND.ME']))
        ->assertInertia(fn ($page) => $page->has('users.data', 1)->where('users.data.0.email', 'find.me@example.com'));

    $this->get(route('admin.users.index', ['page' => 2]))
        ->assertInertia(fn ($page) => $page->has('users.data', 5)->where('users.total', UserController::PER_PAGE + 5));
});

test('admin access is granted and revoked only from the command line', function () {
    $user = User::factory()->create(['email' => 'boss@example.com']);

    $this->artisan('app:make-admin', ['email' => 'BOSS@example.com'])->assertSuccessful();
    expect($user->fresh()->is_admin)->toBeTrue();

    $this->artisan('app:make-admin', ['email' => 'boss@example.com', '--revoke' => true])->assertSuccessful();
    expect($user->fresh()->is_admin)->toBeFalse();

    $this->artisan('app:make-admin', ['email' => 'nobody@example.com'])->assertFailed();
});

test('players cannot make themselves admin through their profile', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'is_admin' => true,
    ]);

    expect($user->fresh()->is_admin)->toBeFalse();
});
