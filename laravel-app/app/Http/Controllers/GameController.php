<?php

namespace App\Http\Controllers;

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class GameController extends Controller
{
    public function show(Game $game): Response
    {
        $game->load([
            'players' => fn ($query) => $query->with('user:id,name,codename'),
            'host:id,name,codename',
        ]);

        return inertia('games/Lobby', [
            'game' => $game->makeHidden('secret_location'),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function join(Request $request, string $code, JoinGame $joinGame): RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        if (! $game) {
            return back()->withErrors(['code' => 'No operation found with that invite code.']);
        }

        $joinGame->handle($game, $request->user());

        return to_route('games.show', $game);
    }
}
