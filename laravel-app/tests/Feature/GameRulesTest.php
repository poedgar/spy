<?php

use App\Actions\Games\JoinGame;
use App\Enums\GameStatus;
use App\Enums\Locale;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;

test('a game that is no longer recruiting cannot be joined by code', function (string $status) {
    $game = Game::factory()->create(['status' => $status]);
    $user = User::factory()->create();

    expect(fn () => app(JoinGame::class)->handle($game, $user))
        ->toThrow(GameRuleException::class, 'This operation is no longer recruiting.');

    expect($game->hasPlayer($user))->toBeFalse();
})->with(['active', 'voting', 'completed']);

test('an existing player re-joining a running game is a no-op, not an error', function () {
    $game = Game::factory()->create(['status' => GameStatus::Active]);
    $user = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    expect(app(JoinGame::class)->handle($game, $user)->id)->toBe($game->id);
});

test('the web lobby is only visible to its host and players', function () {
    $game = Game::factory()->create();

    $this->actingAs(User::factory()->create())->get(route('games.show', $game))->assertForbidden();
});

test('the web lobby shows a full round flow to its players', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    GamePlayer::factory()->count(2)->create(['game_id' => $game->id]);

    $this->actingAs($host)->post(route('games.start', $game))->assertRedirect();

    $this->get(route('games.show', $game))
        ->assertInertia(fn ($page) => $page
            ->component('games/Lobby')
            ->where('game.status', 'active')
            ->where('game.round.number', 1)
            ->has('locations')
            ->has('categories'));
});

test('the api register endpoint is rate limited', function () {
    RateLimiter::clear('register');

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/register', ['device_name' => 'phone'])->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/register', ['device_name' => 'phone'])->assertTooManyRequests();
});

test('the web register form is rate limited', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post(route('register.store'), [])->assertSessionHasErrors();
    }

    $this->post(route('register.store'), [])->assertTooManyRequests();
});

test('the api answers in the users saved language', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);
    Sanctum::actingAs(User::factory()->create(['locale' => Locale::Ukrainian]));

    $this->postJson("/api/v1/games/{$game->code}/join")
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Склад цієї операції вже заповнено.');
});

test('a guest gets the Accept-Language language', function () {
    $this->postJson('/api/v1/auth/login', [], ['Accept-Language' => 'uk-UA,uk;q=0.9'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'Поле email є обовʼязковим.');
});

test('a signed-in user can change their language on the web and the api', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('locale.update'), ['locale' => 'uk'])->assertRedirect();
    expect($user->fresh()->locale)->toBe(Locale::Ukrainian);

    Sanctum::actingAs($user);
    $this->putJson('/api/v1/me/locale', ['locale' => 'en'])->assertOk()->assertJsonPath('locale', 'en');
    $this->putJson('/api/v1/me/locale', ['locale' => 'fr'])->assertUnprocessable();
});

test('a guest language choice is kept in the session', function () {
    $this->post(route('locale.update'), ['locale' => 'uk'])->assertSessionHas('locale', 'uk');
});
