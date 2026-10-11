<?php

use App\Enums\GameType;
use App\Models\Game;
use App\Models\User;
use App\Support\GameNameGenerator;
use Laravel\Sanctum\Sanctum;

test('random names fit the game and the player\'s language', function () {
    expect(GameNameGenerator::for(GameType::Spy, 'en'))->toMatch('/^Operation \w+ \w+$/')
        ->and(GameNameGenerator::for(GameType::Phrase, 'en'))->toMatch('/^Phrase Club: \w+ \w+$/')
        ->and(GameNameGenerator::for(GameType::Spy, 'uk'))->toMatch('/^Операція «\S+ \S+»$/u')
        ->and(GameNameGenerator::for(GameType::Phrase, 'uk'))->toMatch('/^Клуб фраз «\S+ \S+»$/u');
});

test('both apps can ask for a fresh name', function () {
    Sanctum::actingAs(User::factory()->create(['locale' => 'uk']));
    $this->getJson('/api/v1/game-name?type=spy')->assertOk()->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Операція'));
    $this->getJson('/api/v1/game-name?type=chess')->assertJsonValidationErrors('type');

    $this->actingAs(User::factory()->create())->getJson(route('game-name', ['type' => 'phrase']))
        ->assertOk()
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Phrase Club:'));
});

test('a game created without a name gets one', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games', ['title' => '', 'game_mode' => 'mole', 'age_tier' => 'adults', 'max_players' => 5])
        ->assertCreated()
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Operation '));
});

test('the host renames a game until its first round starts', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    Sanctum::actingAs($host);

    $this->getJson("/api/v1/games/{$game->code}")->assertJsonPath('can_rename', true);
    $this->postJson("/api/v1/games/{$game->code}/settings", ['title' => 'Friday Spies'])
        ->assertOk()
        ->assertJsonPath('title', 'Friday Spies');

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/settings", ['title' => 'Mine now'])->assertForbidden();
    $this->getJson("/api/v1/games/{$game->code}")->assertJsonPath('can_rename', false);

    startedRound($game, $host);
    $this->postJson("/api/v1/games/{$game->code}/reset")->assertOk();

    // Back to recruiting, but it has been played: the name stays.
    $this->postJson("/api/v1/games/{$game->code}/settings", ['title' => 'Too late'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
    expect($game->fresh()->title)->toBe('Friday Spies');
});

test('the web lobby renames through the same settings', function () {
    [$game, $host] = gameWithPlayers(1);

    $this->actingAs($host)->post(route('games.settings', $game), ['title' => 'From the web'])->assertRedirect();

    expect(Game::find($game->id)->title)->toBe('From the web');
});
