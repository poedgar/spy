<?php

use App\Events\ChatMessagePosted;
use App\Models\GameMessage;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

test('players chat in their lobby; it is broadcast without anyone\'s email', function () {
    Event::fake([ChatMessagePosted::class]);
    [$game, $host, $players] = gameWithPlayers(2);
    Sanctum::actingAs($players[1]);

    $this->postJson("/api/v1/games/{$game->code}/messages", ['body' => '  Ready when you are  '])
        ->assertCreated()
        ->assertJsonPath('body', 'Ready when you are')
        ->assertJsonPath('user.codename', $players[1]->codename)
        ->assertJsonMissingPath('user.email');

    Event::assertDispatched(ChatMessagePosted::class, function (ChatMessagePosted $event) use ($game) {
        return $event->broadcastOn()[0]->name === "private-game.{$game->id}"
            && $event->broadcastAs() === 'chat.message'
            && ! array_key_exists('email', $event->broadcastWith()['message']['user']);
    });
});

test('the lobby shows the latest messages, oldest first', function () {
    [$game, $host] = gameWithPlayers(2);
    foreach (range(1, GameMessage::RECENT + 5) as $n) {
        GameMessage::create(['game_id' => $game->id, 'user_id' => $host->id, 'body' => "message {$n}"]);
    }
    Sanctum::actingAs($host);

    $messages = $this->getJson("/api/v1/games/{$game->code}/messages")->assertOk()->json();

    expect($messages)->toHaveCount(GameMessage::RECENT)
        ->and($messages[0]['body'])->toBe('message 6')
        ->and(end($messages)['body'])->toBe('message '.(GameMessage::RECENT + 5));
});

test('only players may read or write a game\'s chat, and messages have limits', function () {
    [$game, $host] = gameWithPlayers(2);

    Sanctum::actingAs(User::factory()->create());
    $this->getJson("/api/v1/games/{$game->code}/messages")->assertForbidden();
    $this->postJson("/api/v1/games/{$game->code}/messages", ['body' => 'hi'])->assertForbidden();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/messages", ['body' => '   '])->assertJsonValidationErrors('body');
    $this->postJson("/api/v1/games/{$game->code}/messages", ['body' => str_repeat('a', GameMessage::MAX_LENGTH + 1)])
        ->assertJsonValidationErrors('body');
});

test('the web app reads and posts the same chat by game', function () {
    [$game, $host] = gameWithPlayers(2);

    $this->actingAs($host)->postJson(route('games.messages.store', $game), ['body' => 'From the web'])->assertCreated();
    $this->getJson(route('games.messages', $game))->assertOk()->assertJsonPath('0.body', 'From the web');
});

test('closing a game deletes its chat', function () {
    [$game, $host] = gameWithPlayers(2);
    GameMessage::create(['game_id' => $game->id, 'user_id' => $host->id, 'body' => 'bye']);

    $game->delete();

    expect(GameMessage::count())->toBe(0);
});
