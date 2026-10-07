<?php

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Enums\GameStatus;
use App\Enums\PlayerStatus;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Http\Request;

test('CreateGame creates the game and the host roster row', function () {
    $host = User::factory()->create();

    $game = app(CreateGame::class)->handle($host, [
        'title' => 'Op Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole.',
    ]);

    expect($game->code)->toMatch('/^SPY-[A-Z2-9]{4}$/')
        ->and($game->game_type)->toBe('spy')
        ->and($game->host_id)->toBe($host->id)
        ->and($game->status)->toBe(GameStatus::Recruiting);

    $player = GamePlayer::where('game_id', $game->id)->sole();
    expect($player->user_id)->toBe($host->id)
        ->and($player->is_host)->toBeTrue()
        ->and($player->status)->toBe(PlayerStatus::Ready);
});

test('JoinGame adds the user to the roster', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    app(JoinGame::class)->handle($game, $user);

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeTrue();
});

test('JoinGame is a no-op for a user already on the roster', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    app(JoinGame::class)->handle($game, $user);

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('JoinGame rejects a full roster with a code-field rule exception', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);

    try {
        app(JoinGame::class)->handle($game, User::factory()->create());
        $this->fail('Expected GameRuleException');
    } catch (GameRuleException $e) {
        expect($e->field)->toBe('code')
            ->and($e->getMessage())->toBe('This operation roster is already full.');
    }
});

test('GameRuleException renders as a 422 validation body for API requests', function () {
    $request = Request::create('/api/v1/anything', 'POST');

    $response = (new GameRuleException('code', 'Nope.'))->render($request);

    expect($response->getStatusCode())->toBe(422)
        ->and($response->getData(true))->toBe([
            'message' => 'Nope.',
            'errors' => ['code' => ['Nope.']],
        ]);
});
