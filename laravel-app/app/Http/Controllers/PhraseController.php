<?php

namespace App\Http\Controllers;

use App\Actions\Phrase\CreatePhraseGame;
use App\Actions\Phrase\GuessPhrase;
use App\Actions\Phrase\PassTurn;
use App\Actions\Phrase\RevealPhrase;
use App\Actions\Phrase\StartPhraseRound;
use App\Http\Requests\StorePhraseGameRequest;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PhraseController extends Controller
{
    public function store(StorePhraseGameRequest $request, CreatePhraseGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function start(Request $request, Game $game, StartPhraseRound $startRound): RedirectResponse
    {
        $startRound->handle($game, $request->user());

        return back();
    }

    public function turn(Request $request, Game $game, PassTurn $passTurn): RedirectResponse
    {
        $passTurn->handle($game, $request->user());

        return back();
    }

    public function reveal(Request $request, Game $game, RevealPhrase $revealPhrase): RedirectResponse
    {
        $revealPhrase->handle($game, $request->user());

        return back();
    }

    public function guess(Request $request, Game $game, GuessPhrase $guessPhrase): RedirectResponse
    {
        $validated = $request->validate(['guess' => ['required', 'string', 'max:500']]);
        $guessPhrase->handle($game, $request->user(), $validated['guess']);

        return back();
    }
}
