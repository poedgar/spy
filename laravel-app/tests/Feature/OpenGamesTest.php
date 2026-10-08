<?php

use App\Enums\GameType;
use App\Enums\InvitationStatus;
use App\Events\JoinRequested;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\JoinRequest;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

function hostedOpenGame(array $attributes = [], int $players = 1): Game
{
    $game = Game::factory()->create(['max_players' => 4, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $game->host_id, 'is_host' => true]);
    GamePlayer::factory()->count($players - 1)->create(['game_id' => $game->id]);

    return $game;
}

test('open games lists listed, recruiting games with a free seat that I am not in', function () {
    $me = User::factory()->create();
    $open = hostedOpenGame(['title' => 'Open one']);
    hostedOpenGame(['is_listed' => false]);
    hostedOpenGame(['status' => 'active']);
    hostedOpenGame([], players: 4); // full
    hostedOpenGame(['game_type' => 'phrase', 'game_mode' => null, 'phrase_language' => 'en']);
    $mine = hostedOpenGame();
    GamePlayer::factory()->create(['game_id' => $mine->id, 'user_id' => $me->id]);

    Sanctum::actingAs($me);
    $this->getJson('/api/v1/games/spy')
        ->assertOk()
        ->assertJsonCount(1, 'open_games')
        ->assertJsonPath('open_games.0.code', $open->code)
        ->assertJsonPath('open_games.0.host_codename', $open->host->codename)
        ->assertJsonPath('open_games.0.player_count', 1)
        ->assertJsonPath('open_games.0.my_request', null);

    $this->getJson('/api/v1/games/phrase')->assertJsonCount(1, 'open_games');
});

test('a player requests to join from the list, sees it pending, and can withdraw it', function () {
    Event::fake([JoinRequested::class]);
    $game = hostedOpenGame();
    $me = User::factory()->create();
    Sanctum::actingAs($me);

    // Requests always go to the host, even with approval switched off.
    expect($game->requires_approval)->toBeFalse();
    $this->postJson("/api/v1/games/{$game->code}/join-requests")
        ->assertCreated()
        ->assertJsonPath('status', 'requested');
    Event::assertDispatched(JoinRequested::class);
    expect($game->hasPlayer($me))->toBeFalse();

    $this->getJson('/api/v1/games/spy')->assertJsonPath('open_games.0.my_request', 'pending');

    $this->deleteJson("/api/v1/games/{$game->code}/join-requests/mine")->assertNoContent();
    expect(JoinRequest::count())->toBe(0);
});

test('the host lets a requester in from the lobby', function () {
    $game = hostedOpenGame();
    $me = User::factory()->create();
    $request = JoinRequest::create(['game_id' => $game->id, 'user_id' => $me->id]);

    Sanctum::actingAs($game->host);
    $this->postJson("/api/v1/games/{$game->code}/join-requests/{$request->id}/approve")
        ->assertOk()
        ->assertJsonPath('player_count', 2);
});

test('a declined player can ask again, and shows as declined until then', function () {
    $game = hostedOpenGame();
    $me = User::factory()->create();
    JoinRequest::create(['game_id' => $game->id, 'user_id' => $me->id, 'status' => InvitationStatus::Declined]);
    Sanctum::actingAs($me);

    $this->getJson('/api/v1/games/spy')->assertJsonPath('open_games.0.my_request', 'declined');
    $this->postJson("/api/v1/games/{$game->code}/join-requests")->assertCreated();

    expect(JoinRequest::sole()->status)->toBe(InvitationStatus::Pending);
});

test('requests are refused for full, running or already-joined games', function () {
    $me = User::factory()->create();
    Sanctum::actingAs($me);

    $full = hostedOpenGame([], players: 4);
    $this->postJson("/api/v1/games/{$full->code}/join-requests")->assertUnprocessable()->assertJsonValidationErrors('game');

    $running = hostedOpenGame(['status' => 'active']);
    $this->postJson("/api/v1/games/{$running->code}/join-requests")->assertUnprocessable();

    $mine = hostedOpenGame();
    GamePlayer::factory()->create(['game_id' => $mine->id, 'user_id' => $me->id]);
    $this->postJson("/api/v1/games/{$mine->code}/join-requests")->assertUnprocessable();
});

test('the host can unlist a game', function () {
    $game = hostedOpenGame();

    $this->actingAs($game->host)->post(route('games.settings', $game), ['is_listed' => false])->assertRedirect();

    expect($game->fresh()->is_listed)->toBeFalse()
        ->and($game->fresh()->requires_approval)->toBeFalse();
});

test('the web home pages carry open games and the request button works', function () {
    $spy = hostedOpenGame();
    $phrase = hostedOpenGame(['game_type' => GameType::Phrase, 'game_mode' => null, 'phrase_language' => 'uk']);
    $me = User::factory()->create();

    $this->actingAs($me)->get(route('games.spy'))
        ->assertInertia(fn ($page) => $page->has('openGames', 1)->where('openGames.0.code', $spy->code));
    $this->get(route('games.phrase'))
        ->assertInertia(fn ($page) => $page->has('openGames', 1)->where('openGames.0.phrase_language', 'uk'));

    $this->from(route('games.spy'))->post(route('join-requests.store', $spy))->assertRedirect(route('games.spy'));
    expect(JoinRequest::where('game_id', $spy->id)->where('user_id', $me->id)->exists())->toBeTrue();

    $this->delete(route('join-requests.cancel', $spy))->assertRedirect();
    expect(JoinRequest::count())->toBe(0);
});
