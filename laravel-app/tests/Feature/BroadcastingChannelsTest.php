<?php

use App\Models\User;

test('a user can authorize their own private channel', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'private-user.'.$user->id,
        'socket_id' => '1234.5678',
    ]);

    $response->assertOk();
});

test('a user cannot authorize another users private channel', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'private-user.'.$otherUser->id,
        'socket_id' => '1234.5678',
    ]);

    $response->assertForbidden();
});

test('any authenticated user can join the online-users presence channel', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ]);

    $response->assertOk();

    // Pusher's wire format nests `channel_data` as a JSON-encoded string
    // (not a JSON object Laravel's assertJsonPath can traverse into) — decode
    // it explicitly rather than assuming either shape.
    $channelData = $response->json('channel_data');
    $decoded = is_string($channelData) ? json_decode($channelData, true) : $channelData;

    expect($decoded['user_info']['codename'] ?? null)->toBe($user->codename);
});

test('a guest cannot authorize any channel', function () {
    $response = $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ]);

    $response->assertRedirect(route('login'));
});
