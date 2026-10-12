<?php

namespace App\Http\Controllers;

use App\Actions\Song\CloseSongVoting;
use App\Actions\Song\CreateSongGame;
use App\Actions\Song\PassSingTurn;
use App\Actions\Song\StartSongRound;
use App\Actions\Song\VoteForSinger;
use App\Http\Requests\StoreSongGameRequest;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SongController extends Controller
{
    public function store(StoreSongGameRequest $request, CreateSongGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function start(Request $request, Game $game, StartSongRound $startRound): RedirectResponse
    {
        $startRound->handle($game, $request->user());

        return back();
    }

    public function turn(Request $request, Game $game, PassSingTurn $passTurn): RedirectResponse
    {
        $passTurn->handle($game, $request->user());

        return back();
    }

    public function vote(Request $request, Game $game, VoteForSinger $vote): RedirectResponse
    {
        $validated = $request->validate(['singer_id' => ['required', 'integer']]);
        $vote->handle($game, $request->user(), (int) $validated['singer_id']);

        return back();
    }

    public function close(Request $request, Game $game, CloseSongVoting $close): RedirectResponse
    {
        $close->handle($game, $request->user());

        return back();
    }
}
