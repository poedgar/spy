<?php

namespace App\Http\Controllers;

use App\Actions\Emotion\AnswerEmotion;
use App\Actions\Emotion\CreateEmotionGame;
use App\Actions\Emotion\RevealEmotion;
use App\Actions\Emotion\StartEmotionRound;
use App\Http\Requests\StoreEmotionGameRequest;
use App\Models\Game;
use App\Support\EmotionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmotionController extends Controller
{
    public function store(StoreEmotionGameRequest $request, CreateEmotionGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function start(Request $request, Game $game, StartEmotionRound $startRound): RedirectResponse
    {
        $startRound->handle($game, $request->user());

        return back();
    }

    public function answer(Request $request, Game $game, AnswerEmotion $answer): RedirectResponse
    {
        $validated = $request->validate(['emotion' => ['required', Rule::in(EmotionCatalog::EMOTIONS)]]);
        $answer->handle($game, $request->user(), (string) $validated['emotion']);

        return back();
    }

    public function reveal(Request $request, Game $game, RevealEmotion $reveal): RedirectResponse
    {
        $reveal->handle($game, $request->user());

        return back();
    }
}
