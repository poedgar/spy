<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
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

    public function store(StoreGameRequest $request): RedirectResponse
    {
        $game = DB::transaction(function () use ($request) {
            $game = Game::create([
                ...$request->validated(),
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
                'host_id' => $request->user()->id,
            ]);

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $request->user()->id,
                'is_host' => true,
                'status' => 'ready',
                'joined_at' => now(),
            ]);

            return $game;
        });

        return to_route('games.show', $game);
    }

    public function join(Request $request, string $code): RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        if (! $game) {
            return back()->withErrors(['code' => 'No operation found with that invite code.']);
        }

        $alreadyJoined = $game->players()->where('user_id', $request->user()->id)->exists();

        if (! $alreadyJoined) {
            if ($game->players()->count() >= $game->max_players) {
                return back()->withErrors(['code' => 'This operation roster is already full.']);
            }

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $request->user()->id,
                'is_host' => false,
                'status' => 'ready',
                'joined_at' => now(),
            ]);
        }

        return to_route('games.show', $game);
    }
}
