<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('a token can authorize its own private user channel', function () {
    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-user.'.$this->user->id,
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth']);
});

test('a token can join the presence channel', function () {
    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth', 'channel_data']);
});

test('a token can authorize a game channel it is a member of, and not others', function () {
    $mine = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $mine->id, 'user_id' => $this->user->id]);
    $theirs = Game::factory()->create();

    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-game.'.$mine->id, 'socket_id' => '1234.5678',
    ])->assertOk();

    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-game.'.$theirs->id, 'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('broadcast auth without a token is 401', function () {
    $this->postJson('/api/broadcasting/auth', [
        'channel_name' => 'presence-online-users', 'socket_id' => '1234.5678',
    ])->assertUnauthorized();
});
