<?php

namespace App\Http\Controllers\Api;

use App\Actions\Song\CloseSongVoting;
use App\Actions\Song\CreateSongGame;
use App\Actions\Song\PassSingTurn;
use App\Actions\Song\StartSongRound;
use App\Actions\Song\VoteForSinger;
use App\Enums\GameType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSongGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Queries\GameHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SongController extends Controller
{
    public function home(Request $request, GameHomeQuery $home): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($home->games($request->user(), GameType::Song)),
            'open_games' => $home->openGames($request->user(), GameType::Song),
            'pending_invitations' => InvitationResource::collection($home->pendingInvitations($request->user(), GameType::Song)),
        ]);
    }

    public function store(StoreSongGameRequest $request, CreateSongGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return GameController::lobby($game)->response()->setStatusCode(201);
    }

    public function start(Request $request, string $code, StartSongRound $startRound): GameResource
    {
        $game = GameController::member($request, $code);
        $startRound->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function turn(Request $request, string $code, PassSingTurn $passTurn): GameResource
    {
        $game = GameController::member($request, $code);
        $passTurn->handle($game, $request->user());

        return GameController::lobby($game);
    }

    public function vote(Request $request, string $code, VoteForSinger $vote): GameResource
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['singer_id' => ['required', 'integer']]);
        $vote->handle($game, $request->user(), (int) $validated['singer_id']);

        return GameController::lobby($game);
    }

    public function close(Request $request, string $code, CloseSongVoting $close): GameResource
    {
        $game = GameController::member($request, $code);
        $close->handle($game, $request->user());

        return GameController::lobby($game);
    }
}
