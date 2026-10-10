<?php

use App\Enums\GameType;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRound;
use App\Models\PhraseRound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

// Shared game setups for the feature tests.

/**
 * @return array{0: Game, 1: User, 2: list<User>}
 */
function gameWithPlayers(int $count, array $attributes = []): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    $others = User::factory()->count($count - 1)->create()->each(
        fn (User $user) => GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]),
    );

    return [$game, $host, [$host, ...$others->all()]];
}

function startedRound(Game $game, User $host): GameRound
{
    Sanctum::actingAs($host);
    test()->postJson("/api/v1/games/{$game->code}/start")->assertOk();

    return $game->currentRound()->firstOrFail();
}

/**
 * @param  list<User>  $players
 * @return array{0: User, 1: User} a spy and a loyalist
 */
function rolesOf(GameRound $round, array $players): array
{
    $spy = collect($players)->first(fn (User $user) => $round->isSpy($user));
    $loyalist = collect($players)->first(fn (User $user) => ! $round->isSpy($user));

    return [$spy, $loyalist];
}

/**
 * @return array{0: Game, 1: User, 2: list<User>}
 */
function phraseGame(int $count, string $language = 'en'): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create([
        'host_id' => $host->id,
        'game_type' => GameType::Phrase,
        'game_mode' => null,
        'mission_briefing' => null,
        'phrase_language' => $language,
        'max_players' => 10,
    ]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    $others = User::factory()->count($count - 1)->create()->each(
        fn (User $user) => GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]),
    );

    return [$game, $host, [$host, ...$others->all()]];
}

function dealPhrase(Game $game, User $host): PhraseRound
{
    Sanctum::actingAs($host);
    test()->postJson("/api/v1/games/{$game->code}/phrase/start")->assertOk();

    return $game->currentPhraseRound()->firstOrFail();
}
