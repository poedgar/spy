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
