<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{
    public function show(Game $game)
    {
        return inertia('games/Lobby', [
            'game' => $game->load('players.user', 'host'),
        ]);
    }

    public function store(StoreGameRequest $request)
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

    public function join(Request $request, Game $game)
    {
        $alreadyJoined = $game->players()->where('user_id', $request->user()->id)->exists();

        if (! $alreadyJoined) {
            if ($game->players()->count() >= $game->max_players) {
                return back()->withErrors(['game' => 'This operation roster is already full.']);
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
