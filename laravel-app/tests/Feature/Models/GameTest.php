<?php

use App\Models\Game;

test('generateUniqueCode returns a code in the SPY-XXXX format', function () {
    $code = Game::generateUniqueCode();

    expect($code)->toMatch('/^SPY-[A-Z0-9]{4}$/');
});

test('generateUniqueCode never collides with an existing game code', function () {
    $taken = collect(range(1, 25))->map(fn () => Game::factory()->create()->code);

    $new = Game::generateUniqueCode();

    expect($taken)->not->toContain($new);
});

test('a game belongs to its host', function () {
    $game = Game::factory()->create();

    expect($game->host)->toBeInstanceOf(\App\Models\User::class);
});

test('a games route key is its invite code, not its numeric id', function () {
    $game = Game::factory()->create();

    expect($game->getRouteKeyName())->toBe('code');
});
