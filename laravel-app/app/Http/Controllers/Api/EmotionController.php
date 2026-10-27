<?php

namespace App\Http\Controllers\Api;

use App\Actions\Emotion\AnswerEmotion;
use App\Actions\Emotion\CreateEmotionGame;
use App\Actions\Emotion\RevealEmotion;
use App\Actions\Emotion\StartEmotionRound;
use App\Enums\GameType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmotionGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Queries\GameHomeQuery;
use App\Support\EmotionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmotionController extends Controller
{
    public function home(Request $request, GameHomeQuery $home): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($home->games($request->user(), GameType::Emotion)),
            'open_games' => $home->openGames($request->user(), GameType::Emotion),
            'pending_invitations' => InvitationResource::collection($home->pendingInvitations($request->user(), GameType::Emotion)),
        ]);
    }

    public function store(StoreEmotionGameRequest $request, CreateEmotionGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return GameController::lobby($game)->response()->setStatusCode(201);
    }

    public function start(Request $request, string $code, StartEmotionRound $startRound): GameResource
    {
        $game = GameController::member($request, $code);
        $startRound->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function answer(Request $request, string $code, AnswerEmotion $answer): GameResource
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['emotion' => ['required', Rule::in(EmotionCatalog::EMOTIONS)]]);
        $answer->handle($game, $request->user(), (string) $validated['emotion']);

        return GameController::lobby($game);
    }

    public function reveal(Request $request, string $code, RevealEmotion $reveal): GameResource
    {
        $game = GameController::member($request, $code);
        $reveal->handle($game, $request->user());

        return GameController::lobby($game);
    }
}
