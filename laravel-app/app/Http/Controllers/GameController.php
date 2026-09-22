<?php

namespace App\Http\Controllers;

use App\Models\Game;

class GameController extends Controller
{
    public function show(Game $game)
    {
        return inertia('games/Lobby', [
            'game' => $game->load('players.user', 'host'),
        ]);
    }
}
