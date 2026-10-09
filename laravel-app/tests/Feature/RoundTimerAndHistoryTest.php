<?php

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PhraseEnding;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/**
 * @return array{0: Game, 1: User, 2: list<User>}
 */
function timedGame(array $attributes = []): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $others = User::factory()->count(2)->create()->each(
        fn (User $user) => GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]),
    );

    return [$game, $host, [$host, ...$others->all()]];
}

function phraseAttributes(array $extra = []): array
{
    return ['game_type' => GameType::Phrase, 'game_mode' => null, 'mission_briefing' => null, 'phrase_language' => 'en', ...$extra];
}

test('hosts pick a round timer when creating a game; none means no timer', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games', [
        'title' => 'Timed', 'game_mode' => 'codebreaker', 'max_players' => 6, 'mission_briefing' => 'Go.', 'round_seconds' => 480,
    ])->assertCreated()->assertJsonPath('round_seconds', 480);

    $this->postJson('/api/v1/games/phrase', ['title' => 'Untimed', 'phrase_language' => 'en', 'max_players' => 3, 'round_seconds' => 0])
        ->assertCreated()
        ->assertJsonPath('round_seconds', null);

    $this->postJson('/api/v1/games/phrase', ['title' => 'Odd', 'phrase_language' => 'en', 'max_players' => 3, 'round_seconds' => 7])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('round_seconds');
});

test('a timed spy round moves to the vote when time is up', function () {
    [$game, $host] = timedGame(['round_seconds' => 180]);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/start")
        ->assertOk()
        ->assertJsonPath('status', 'active')
        ->assertJson(fn ($json) => $json->whereType('round.ends_at', 'string')->etc());

    $this->travel(181)->seconds();

    $this->getJson("/api/v1/games/{$game->code}")->assertJsonPath('status', 'voting');
});

test('an untimed round never ends on its own', function () {
    [$game, $host] = timedGame();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/start")->assertJsonPath('round.ends_at', null);

    $this->travel(2)->days();

    $this->getJson("/api/v1/games/{$game->code}")->assertJsonPath('status', 'active');
});

test('a timed phrase deal is revealed with no winner when time is up', function () {
    [$game, $host] = timedGame(phraseAttributes(['round_seconds' => 300]));
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertOk();

    $this->travel(301)->seconds();

    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('phrase.result.ending', 'time_up')
        ->assertJsonPath('phrase.result.winner_user_id', null);
});

test('the host can reveal a phrase nobody is getting', function () {
    [$game, $host, $players] = timedGame(phraseAttributes());
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertOk();

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/reveal")->assertForbidden();

    Sanctum::actingAs($host);
    $response = $this->postJson("/api/v1/games/{$game->code}/phrase/reveal")
        ->assertOk()
        ->assertJsonPath('phrase.result.ending', 'revealed');

    expect($response->json('phrase.result.phrase'))->not->toBeEmpty()
        ->and(GamePlayer::where('game_id', $game->id)->sum('score'))->toBe(0)
        ->and($game->currentPhraseRound()->first()->ending)->toBe(PhraseEnding::Revealed);

    $this->postJson("/api/v1/games/{$game->code}/phrase/reveal")->assertUnprocessable();
});

test('the lobby lists earlier rounds, newest first, without repeating the one on show', function () {
    [$game, $host, $players] = timedGame(phraseAttributes());
    Sanctum::actingAs($host);

    foreach (range(1, 3) as $deal) {
        $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertOk();
        $this->postJson("/api/v1/games/{$game->code}/phrase/reveal")->assertOk();
    }

    $history = $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('status', 'completed')
        ->json('history');

    // Deal 3 is the result on screen; 2 and 1 are history.
    expect(array_column($history, 'number'))->toBe([2, 1])
        ->and($history[0]['ending'])->toBe('revealed')
        ->and($history[0]['phrase'])->not->toBeEmpty();

    $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertOk();
    expect(array_column($this->getJson("/api/v1/games/{$game->code}")->json('history'), 'number'))->toBe([3, 2, 1]);
});

test('spy history shows each round location, spies and winners', function () {
    [$game, $host, $players] = timedGame();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/start")->assertOk();
    $round = $game->currentRound()->first();
    $spy = collect($players)->first(fn (User $user) => $round->isSpy($user));
    Sanctum::actingAs($spy);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $round->location_id])->assertOk();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/start")->assertOk();

    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('history.0.number', 1)
        ->assertJsonPath('history.0.winning_team', 'spies')
        ->assertJsonPath('history.0.location.id', $round->location_id)
        ->assertJsonPath('history.0.spy_user_ids', [$spy->id]);

    expect($game->fresh()->status)->toBe(GameStatus::Active);
});
