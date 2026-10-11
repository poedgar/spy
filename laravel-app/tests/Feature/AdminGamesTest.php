<?php

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Http\Controllers\Admin\GameController;
use App\Models\Game;
use App\Models\User;

test('only administrators can see all games', function () {
    $this->actingAs(User::factory()->create())->get(route('admin.games.index'))->assertForbidden();
    $this->actingAs(User::factory()->create(['is_admin' => true]))->get(route('admin.games.index'))->assertOk();
});

test('admins see every game with its host, players and activity', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    [$game, $host, $players] = gameWithPlayers(3, ['title' => 'Nightfall']);
    startedRound($game, $host);

    $this->actingAs($admin)->get(route('admin.games.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/Games')
            ->where('stats.total', 1)
            ->where('stats.playing', 1)
            ->where('games.data.0.title', 'Nightfall')
            ->where('games.data.0.code', $game->code)
            ->where('games.data.0.host.codename', $host->codename)
            ->where('games.data.0.players_count', 3)
            ->where('games.data.0.players', collect($players)->pluck('codename')->all())
            ->where('games.data.0.rounds_count', 1));
});

test('admins can search, filter by type and status, and page through games', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Game::factory()->create(['title' => 'Find Me', 'game_type' => GameType::Phrase, 'game_mode' => null, 'status' => GameStatus::Recruiting]);
    Game::factory()->count(GameController::PER_PAGE + 2)->create(['status' => GameStatus::Completed]);

    $this->actingAs($admin)->get(route('admin.games.index', ['q' => 'find me']))
        ->assertInertia(fn ($page) => $page->has('games.data', 1)->where('games.data.0.title', 'Find Me'));
    $this->get(route('admin.games.index', ['type' => 'phrase']))
        ->assertInertia(fn ($page) => $page->has('games.data', 1));
    $this->get(route('admin.games.index', ['status' => 'completed', 'page' => 2]))
        ->assertInertia(fn ($page) => $page->has('games.data', 2)->where('games.total', GameController::PER_PAGE + 2));
});

test('admins can list one player\'s games from the users page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    [$mine] = gameWithPlayers(1);
    $player = $mine->host;
    gameWithPlayers(2);

    $this->actingAs($admin)->get(route('admin.games.index', ['user' => $player->id]))
        ->assertInertia(fn ($page) => $page
            ->has('games.data', 1)
            ->where('games.data.0.code', $mine->code)
            ->where('filters.user.codename', $player->codename));
});

// --- Abandoned games ------------------------------------------------------------

test('a game recruiting for over a day without a round is abandoned', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $stale = Game::factory()->create(['title' => 'Stale', 'created_at' => now()->subHours(Game::ABANDONED_AFTER_HOURS + 1)]);
    Game::factory()->create(['title' => 'Fresh']);
    [$played, $host] = gameWithPlayers(3, ['title' => 'Played', 'created_at' => now()->subDays(3)]);
    startedRound($played, $host);
    // Back to recruiting, but it was played: not abandoned.
    $this->postJson("/api/v1/games/{$played->code}/reset")->assertOk();
    expect($played->fresh()->status)->toBe(GameStatus::Recruiting);

    $this->actingAs($admin)->get(route('admin.games.index', ['status' => 'abandoned']))
        ->assertInertia(fn ($page) => $page
            ->where('stats.abandoned', 1)
            ->has('games.data', 1)
            ->where('games.data.0.code', $stale->code)
            ->where('games.data.0.abandoned', true));
});

test('admins remove an abandoned game, but nothing that is still alive', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $stale = Game::factory()->create(['created_at' => now()->subDays(2)]);
    $fresh = Game::factory()->create();

    $this->actingAs($admin)->delete(route('admin.games.destroy', $stale))->assertRedirect();
    $this->delete(route('admin.games.destroy', $fresh))->assertRedirect();

    expect(Game::find($stale->id))->toBeNull()
        ->and(Game::find($fresh->id))->not->toBeNull();
});

test('admins remove every abandoned game at once; players cannot', function () {
    Game::factory()->count(3)->create(['created_at' => now()->subDays(2)]);
    $alive = Game::factory()->create();

    $this->actingAs(User::factory()->create())->delete(route('admin.games.destroy-abandoned'))->assertForbidden();
    expect(Game::count())->toBe(4);

    $this->actingAs(User::factory()->create(['is_admin' => true]))->delete(route('admin.games.destroy-abandoned'))->assertRedirect();
    expect(Game::pluck('id')->all())->toBe([$alive->id]);
});
