<?php

namespace App\Http\Controllers;

use App\Actions\Finish\CloseFinishVoting;
use App\Actions\Finish\CreateFinishGame;
use App\Actions\Finish\StartFinishRound;
use App\Actions\Finish\StartFinishVoting;
use App\Actions\Finish\SubmitEnding;
use App\Actions\Finish\VoteForEnding;
use App\Http\Requests\StoreFinishGameRequest;
use App\Http\Requests\StoreMeaningGameRequest;
use App\Models\FinishRound;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FinishController extends Controller
{
    /**
     * Finish the Phrase and Interpret the Phrase share these actions.
     */
    public function store(StoreFinishGameRequest $request, CreateFinishGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated(), $request->gameType());

        return to_route('games.show', $game);
    }

    public function storeMeaning(StoreMeaningGameRequest $request, CreateFinishGame $createGame): RedirectResponse
    {
        return $this->store($request, $createGame);
    }

    public function start(Request $request, Game $game, StartFinishRound $startRound): RedirectResponse
    {
        $startRound->handle($game, $request->user());

        return back();
    }

    public function answer(Request $request, Game $game, SubmitEnding $submit): RedirectResponse
    {
        $validated = $request->validate(['ending' => ['required', 'string', 'max:'.FinishRound::MAX_ANSWER_LENGTH]]);
        $submit->handle($game, $request->user(), (string) $validated['ending']);

        return back();
    }

    public function voting(Request $request, Game $game, StartFinishVoting $startVoting): RedirectResponse
    {
        $startVoting->handle($game, $request->user());

        return back();
    }

    public function vote(Request $request, Game $game, VoteForEnding $vote): RedirectResponse
    {
        $validated = $request->validate(['answer' => ['required', 'integer', 'min:0']]);
        $vote->handle($game, $request->user(), (int) $validated['answer']);

        return back();
    }

    public function close(Request $request, Game $game, CloseFinishVoting $close): RedirectResponse
    {
        $close->handle($game, $request->user());

        return back();
    }
}
