<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\PushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

test('sending an invitation pushes to the invitee even when the realtime broadcast fails', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'a']]])]);
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();
    PushToken::create(['user_id' => $invitee->id, 'token' => 'ExponentPushToken[invitee]', 'platform' => 'ios']);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/invitations", ['to_user_id' => $invitee->id])->assertCreated();

    Http::assertSent(fn ($request) => $request->url() === 'https://exp.host/--/api/v2/push/send'
        && $request->data()[0]['to'] === 'ExponentPushToken[invitee]');
});
