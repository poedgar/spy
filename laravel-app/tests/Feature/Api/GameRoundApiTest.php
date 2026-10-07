<?php

use App\Enums\GameStatus;
use App\Enums\PlayerStatus;
use App\Enums\RoundEnding;
use App\Enums\Team;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRound;
use App\Models\User;
use App\Support\LocationCatalog;
use App\Support\LocationData;
use Laravel\Sanctum\Sanctum;

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

test('the host starts a round: a location from the tier and the right number of spies', function () {
    [$game, $host] = gameWithPlayers(5, ['age_tier' => 'children']);

    $round = startedRound($game, $host);

    expect($game->fresh()->status)->toBe(GameStatus::Active)
        ->and($round->number)->toBe(1)
        ->and($round->spy_user_ids)->toHaveCount(2)
        ->and(LocationCatalog::find($round->location_id)['tier'])->toBe('children');
});

test('a round needs at least three operatives', function () {
    [$game, $host] = gameWithPlayers(2);
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/start")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('game');
});

test('only the host can start a round', function () {
    [$game, , $players] = gameWithPlayers(3);
    Sanctum::actingAs($players[1]);

    $this->postJson("/api/v1/games/{$game->code}/start")->assertForbidden();
});

test('a loyalist sees the location; a spy sees only their role', function () {
    [$game, $host, $players] = gameWithPlayers(4);
    $round = startedRound($game, $host);
    [$spy, $loyalist] = rolesOf($round, $players);
    $location = LocationCatalog::find($round->location_id);

    Sanctum::actingAs($loyalist);
    $this->getJson("/api/v1/games/{$game->code}")
        ->assertOk()
        ->assertJsonPath('round.my_role', 'loyalist')
        ->assertJsonPath('round.location.id', $round->location_id)
        ->assertJsonPath('round.result', null);

    Sanctum::actingAs($spy);
    $response = $this->getJson("/api/v1/games/{$game->code}")
        ->assertOk()
        ->assertJsonPath('round.my_role', 'spy')
        ->assertJsonPath('round.location', null)
        ->assertJsonPath('round.spy_count', 1);

    expect($response->getContent())
        ->not->toContain($location['en'])
        ->not->toContain('spy_user_ids');
});

test('the whole table voting for a spy ends the round for the loyalists and scores them', function () {
    [$game, $host, $players] = gameWithPlayers(4);
    $round = startedRound($game, $host);
    [$spy] = rolesOf($round, $players);

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/voting")->assertOk()->assertJsonPath('status', 'voting');

    foreach ($players as $voter) {
        Sanctum::actingAs($voter);
        $suspect = $voter->is($spy) ? collect($players)->first(fn (User $u) => ! $u->is($spy)) : $spy;
        $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $suspect->id])->assertOk();
    }

    $round->refresh();
    expect($game->fresh()->status)->toBe(GameStatus::Completed)
        ->and($round->ending)->toBe(RoundEnding::Vote)
        ->and($round->winning_team)->toBe(Team::Loyalists)
        ->and($round->accused_user_id)->toBe($spy->id);

    $scores = GamePlayer::where('game_id', $game->id)->pluck('score', 'user_id');
    expect($scores[$spy->id])->toBe(0);
    collect($players)->reject(fn (User $u) => $u->is($spy))->each(fn (User $u) => expect($scores[$u->id])->toBe(1));

    Sanctum::actingAs($spy);
    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('round.location.id', $round->location_id)
        ->assertJsonPath('round.result.winning_team', 'loyalists')
        ->assertJsonPath('round.result.spy_user_ids', [$spy->id])
        ->assertJsonCount(4, 'round.result.votes');
});

test('a tie when the host closes voting goes to the spies', function () {
    [$game, $host, $players] = gameWithPlayers(4);
    $round = startedRound($game, $host);
    [$spy, $loyalist] = rolesOf($round, $players);
    $this->postJson("/api/v1/games/{$game->code}/voting")->assertOk();

    // Two votes, two different suspects: no majority.
    $voters = collect($players)->reject(fn (User $u) => $u->is($spy) || $u->is($loyalist))->values();
    Sanctum::actingAs($voters[0]);
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $spy->id])->assertOk();
    Sanctum::actingAs($voters[1]);
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $loyalist->id])->assertOk();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/tally")->assertOk()->assertJsonPath('status', 'completed');

    expect($round->fresh()->winning_team)->toBe(Team::Spies)
        ->and($round->fresh()->accused_user_id)->toBeNull()
        ->and(GamePlayer::where('game_id', $game->id)->where('user_id', $spy->id)->value('score'))->toBe(1);
});

test('votes can be changed until the tally and are validated', function () {
    [$game, $host, $players] = gameWithPlayers(4);
    startedRound($game, $host);
    $this->postJson("/api/v1/games/{$game->code}/voting")->assertOk();

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $players[1]->id])
        ->assertUnprocessable()->assertJsonValidationErrors('suspect_id');
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => User::factory()->create()->id])
        ->assertUnprocessable()->assertJsonValidationErrors('suspect_id');

    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $players[2]->id])->assertOk();
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $players[3]->id])
        ->assertOk()
        ->assertJsonPath('round.my_vote', $players[3]->id)
        ->assertJsonPath('round.voted_user_ids', [$players[1]->id])
        ->assertJsonPath('round.result', null);
});

test('voting before the voting phase is rejected', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    startedRound($game, $host);

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/votes", ['suspect_id' => $players[2]->id])
        ->assertUnprocessable()->assertJsonValidationErrors('suspect_id');
});

test('a spy naming the location wins the round for the spies', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    $round = startedRound($game, $host);
    [$spy] = rolesOf($round, $players);

    Sanctum::actingAs($spy);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $round->location_id])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('game.status', 'completed')
        ->assertJsonPath('game.round.result.ending', 'spy_guess')
        ->assertJsonPath('game.round.result.winning_team', 'spies');

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $spy->id)->value('score'))->toBe(1);
});

test('a wrong guess hands the round to the loyalists', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    $round = startedRound($game, $host);
    [$spy] = rolesOf($round, $players);
    $wrong = collect(LocationCatalog::all())->firstWhere(fn (array $place) => $place['id'] !== $round->location_id)['id'];

    Sanctum::actingAs($spy);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $wrong])
        ->assertOk()
        ->assertJsonPath('correct', false)
        ->assertJsonPath('game.round.result.winning_team', 'loyalists')
        ->assertJsonPath('game.round.result.guessed_location.id', $wrong);

    // The round is over: no second guess.
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $round->location_id])
        ->assertUnprocessable();
});

test('only a spy can guess the location', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    $round = startedRound($game, $host);
    [, $loyalist] = rolesOf($round, $players);

    Sanctum::actingAs($loyalist);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $round->location_id])
        ->assertUnprocessable()->assertJsonValidationErrors('location_id');

    expect($game->fresh()->status)->toBe(GameStatus::Active);
});

test('the next round deals a new location and keeps scores', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    $first = startedRound($game, $host);
    [$spy] = rolesOf($first, $players);

    Sanctum::actingAs($spy);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $first->location_id])->assertOk();

    $second = startedRound($game, $host);

    expect($second->number)->toBe(2)
        ->and($second->location_id)->not->toBe($first->location_id)
        ->and(GamePlayer::where('game_id', $game->id)->where('user_id', $spy->id)->value('score'))->toBe(1);

    Sanctum::actingAs($host);
    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('round.number', 2)
        ->assertJsonPath('round.result', null);
});

test('resetting mid-round abandons it without points and reopens recruiting', function () {
    [$game, $host] = gameWithPlayers(3);
    $round = startedRound($game, $host);

    $this->postJson("/api/v1/games/{$game->code}/reset")
        ->assertOk()
        ->assertJsonPath('status', 'recruiting')
        ->assertJsonPath('round', null);

    expect($round->fresh()->ending)->toBe(RoundEnding::Abandoned)
        ->and($round->fresh()->winning_team)->toBeNull()
        ->and(GamePlayer::where('game_id', $game->id)->sum('score'))->toBe(0);
});

test('players toggle readiness between rounds only', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    Sanctum::actingAs($players[1]);

    $this->postJson("/api/v1/games/{$game->code}/ready")->assertOk()->assertJsonPath('players.1.status', 'pending');
    expect(GamePlayer::where('user_id', $players[1]->id)->first()->status)->toBe(PlayerStatus::Pending);

    startedRound($game, $host);
    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/ready")->assertUnprocessable();
});

test('a player can leave a recruiting game but not mid-round', function () {
    [$game, $host, $players] = gameWithPlayers(4);

    startedRound($game, $host);
    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/leave")->assertUnprocessable();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/reset")->assertOk();

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();
    expect($game->hasPlayer($players[1]))->toBeFalse();
});

test('round actions require membership', function () {
    [$game] = gameWithPlayers(3);
    Sanctum::actingAs(User::factory()->create());

    foreach (['ready', 'start', 'voting', 'tally', 'reset', 'leave'] as $action) {
        $this->postJson("/api/v1/games/{$game->code}/{$action}")->assertForbidden();
    }
});

test('the location guide lists the pool for a tier', function () {
    Sanctum::actingAs(User::factory()->create());

    $children = $this->getJson('/api/v1/locations?tier=children')->assertOk()->json('locations');
    $adults = $this->getJson('/api/v1/locations')->assertOk()->json('locations');

    expect(count($children))->toBeLessThan(count($adults))
        ->and(count($adults))->toBe(count(LocationData::PLACES))
        ->and($children[0])->toHaveKeys(['id', 'en', 'uk', 'category']);
});
