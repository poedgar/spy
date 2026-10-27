<?php

namespace App\Http\Controllers\Api;

use App\Actions\Finish\CloseFinishVoting;
use App\Actions\Finish\CreateFinishGame;
use App\Actions\Finish\StartFinishRound;
use App\Actions\Finish\StartFinishVoting;
use App\Actions\Finish\SubmitEnding;
use App\Actions\Finish\VoteForEnding;
use App\Enums\GameType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFinishGameRequest;
use App\Http\Requests\StoreMeaningGameRequest;
use App\Http\Requests\StoreMemeGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\FinishRound;
use App\Queries\GameHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinishController extends Controller
{
    /**
     * Finish the Phrase, Interpret the Phrase and Meme It share these actions.
     */
    public function home(Request $request, GameHomeQuery $home, GameType $type = GameType::Finish): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($home->games($request->user(), $type)),
            'open_games' => $home->openGames($request->user(), $type),
            'pending_invitations' => InvitationResource::collection($home->pendingInvitations($request->user(), $type)),
        ]);
    }

    public function meaningHome(Request $request, GameHomeQuery $home): JsonResponse
    {
        return $this->home($request, $home, GameType::Meaning);
    }

    public function memeHome(Request $request, GameHomeQuery $home): JsonResponse
    {
        return $this->home($request, $home, GameType::Meme);
    }

    public function store(StoreFinishGameRequest $request, CreateFinishGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated(), $request->gameType());

        return GameController::lobby($game)->response()->setStatusCode(201);
    }

    public function storeMeaning(StoreMeaningGameRequest $request, CreateFinishGame $createGame): JsonResponse
    {
        return $this->store($request, $createGame);
    }

    public function storeMeme(StoreMemeGameRequest $request, CreateFinishGame $createGame): JsonResponse
    {
        return $this->store($request, $createGame);
    }

    public function start(Request $request, string $code, StartFinishRound $startRound): GameResource
    {
        $game = GameController::member($request, $code);
        $startRound->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function answer(Request $request, string $code, SubmitEnding $submit): GameResource
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['ending' => ['required', 'string', 'max:'.FinishRound::MAX_ANSWER_LENGTH]]);
        $submit->handle($game, $request->user(), (string) $validated['ending']);

        return GameController::lobby($game);
    }

    public function voting(Request $request, string $code, StartFinishVoting $startVoting): GameResource
    {
        $game = GameController::member($request, $code);
        $startVoting->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function vote(Request $request, string $code, VoteForEnding $vote): GameResource
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['answer' => ['required', 'integer', 'min:0']]);
        $vote->handle($game, $request->user(), (int) $validated['answer']);

        return GameController::lobby($game);
    }

    public function close(Request $request, string $code, CloseFinishVoting $close): GameResource
    {
        $game = GameController::member($request, $code);
        $close->handle($game, $request->user());

        return GameController::lobby($game);
    }
}
