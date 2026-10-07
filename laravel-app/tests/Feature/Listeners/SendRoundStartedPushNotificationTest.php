<?php

use App\Events\RoundStarted;
use App\Listeners\SendRoundStartedPushNotification;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRound;
use App\Models\PushToken;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

test('the listener is registered for RoundStarted and queued', function () {
    Event::fake();
    Event::assertListening(RoundStarted::class, SendRoundStartedPushNotification::class);

    expect(new SendRoundStartedPushNotification)->toBeInstanceOf(ShouldQueue::class);
});

test('every player but the host is pushed, each in their own language', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok'], ['status' => 'ok']]])]);
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'title' => 'Op Echo']);
    $english = User::factory()->create();
    $ukrainian = User::factory()->create(['locale' => 'uk']);

    foreach ([$host, $english, $ukrainian] as $user) {
        GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id, 'is_host' => $user->is($host)]);
        PushToken::create(['user_id' => $user->id, 'token' => "ExponentPushToken[{$user->id}]", 'platform' => 'ios']);
    }

    $round = GameRound::factory()->create(['game_id' => $game->id, 'number' => 2]);

    app(SendRoundStartedPushNotification::class)->handle(new RoundStarted($round));

    Http::assertSent(function ($request) use ($english, $ukrainian, $game) {
        $messages = collect($request->data())->keyBy('to');

        return $messages->count() === 2
            && $messages["ExponentPushToken[{$english->id}]"]['title'] === 'Round 2 has begun'
            && $messages["ExponentPushToken[{$ukrainian->id}]"]['title'] === 'Раунд 2 розпочато'
            && $messages["ExponentPushToken[{$english->id}]"]['data'] === ['type' => 'round', 'code' => $game->code];
    });
});
