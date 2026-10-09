<?php

namespace App\Http\Controllers\Api;

use App\Actions\Phrase\CreatePhraseGame;
use App\Actions\Phrase\GuessPhrase;
use App\Actions\Phrase\PassTurn;
use App\Actions\Phrase\RevealPhrase;
use App\Actions\Phrase\StartPhraseRound;
use App\Enums\GameType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePhraseGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Queries\GameHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhraseController extends Controller
{
    public function home(Request $request, GameHomeQuery $home): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($home->games($request->user(), GameType::Phrase)),
            'open_games' => $home->openGames($request->user(), GameType::Phrase),
            'pending_invitations' => InvitationResource::collection($home->pendingInvitations($request->user(), GameType::Phrase)),
        ]);
    }

    public function store(StorePhraseGameRequest $request, CreatePhraseGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return GameController::lobby($game)->response()->setStatusCode(201);
    }

    public function start(Request $request, string $code, StartPhraseRound $startRound): GameResource
    {
        $game = GameController::member($request, $code);
        $startRound->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function turn(Request $request, string $code, PassTurn $passTurn): GameResource
    {
        $game = GameController::member($request, $code);
        $passTurn->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function reveal(Request $request, string $code, RevealPhrase $revealPhrase): GameResource
    {
        $game = GameController::member($request, $code);
        $revealPhrase->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function guess(Request $request, string $code, GuessPhrase $guessPhrase): JsonResponse
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['guess' => ['required', 'string', 'max:500']]);
        $correct = $guessPhrase->handle($game, $request->user(), $validated['guess']);

        return response()->json([
            'correct' => $correct,
            'game' => GameController::lobby($game),
        ]);
    }
}
