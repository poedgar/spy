<?php

use App\Enums\GameType;
use App\Models\User;
use App\Notifications\ReadyToStart;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

test('the host picks how many players a round needs and how many the table holds', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/song', ['min_players' => 5, 'max_players' => 12])
        ->assertCreated()
        ->assertJsonPath('min_players', 5)
        ->assertJsonPath('max_players', 12)
        ->assertJsonPath('min_allowed_players', 3)
        ->assertJsonPath('max_allowed_players', 20);
});

test('older clients that send only the table size get the minimum of three', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/meme', ['max_players' => 8])
        ->assertCreated()
        ->assertJsonPath('min_players', 3);
});

test('the minimum stays within the type limits and never above the maximum', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/emotion', ['emotion_level' => 1, 'min_players' => 2, 'max_players' => 6])
        ->assertJsonValidationErrors('min_players');
    $this->postJson('/api/v1/games/emotion', ['emotion_level' => 1, 'min_players' => 7, 'max_players' => 6])
        ->assertJsonValidationErrors('min_players');
    $this->postJson('/api/v1/games/phrase', ['phrase_language' => 'en', 'min_players' => 3, 'max_players' => 13])
        ->assertJsonValidationErrors('max_players');
    $this->postJson('/api/v1/games/phrase', ['phrase_language' => 'en', 'min_players' => 12, 'max_players' => 12])
        ->assertCreated();
});

test('new games default to a table of twelve where the type allows it', function () {
    foreach (GameType::cases() as $type) {
        expect($type->defaultMaxPlayers())->toBe(12);
    }
});

test('a round waits for the host minimum', function () {
    [$game, $host] = songGame(3);
    $game->update(['min_players' => 4]);

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/song/start")
        ->assertUnprocessable()
        ->assertJsonFragment(['At least 4 operatives are required to start.']);
});

test('the host hears the table is ready at their own minimum', function () {
    Notification::fake();
    [$game, $host] = gameWithPlayers(1, ['max_players' => 8, 'min_players' => 4]);

    foreach (User::factory()->count(3)->create() as $index => $joiner) {
        Sanctum::actingAs($joiner);
        $this->postJson("/api/v1/games/{$game->code}/join")->assertOk();

        if ($index < 2) {
            Notification::assertNothingSentTo($host);
        }
    }

    Notification::assertSentToTimes($host, ReadyToStart::class, 1);
});
