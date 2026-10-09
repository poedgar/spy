<?php

namespace App\Http\Controllers\Api;

use App\Actions\Invitations\CancelInvitation;
use App\Actions\Lobby\AnswerJoinRequest;
use App\Actions\Lobby\CloseGame;
use App\Actions\Lobby\RemovePlayer;
use App\Actions\Lobby\RequestToJoin;
use App\Actions\Lobby\TransferHost;
use App\Actions\Lobby\UpdateGameSettings;
use App\Enums\JoinOutcome;
use App\Http\Controllers\Controller;
use App\Http\Resources\GameResource;
use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The host's lobby controls, shared by both games. Each answers with the
 * host's refreshed view of the lobby.
 */
class LobbyController extends Controller
{
    public function settings(Request $request, string $code, UpdateGameSettings $updateSettings): GameResource
    {
        $game = GameController::member($request, $code);
        $updateSettings->handle($game, $request->user(), $request->validate([
            'requires_approval' => ['sometimes', 'boolean'],
            'is_listed' => ['sometimes', 'boolean'],
        ]));

        return GameController::lobby($game);
    }

    public function removePlayer(Request $request, string $code, int $user, RemovePlayer $removePlayer): GameResource
    {
        $game = GameController::member($request, $code);
        $removePlayer->handle($game, $request->user(), $user);

        return GameController::lobby($game);
    }

    public function transferHost(Request $request, string $code, TransferHost $transferHost): GameResource
    {
        $game = GameController::member($request, $code);
        $validated = $request->validate(['user_id' => ['required', 'integer']]);
        $transferHost->handle($game, $request->user(), (int) $validated['user_id']);

        return GameController::lobby($game);
    }

    public function approve(Request $request, string $code, int $joinRequest, AnswerJoinRequest $answer): GameResource
    {
        $game = GameController::member($request, $code);
        $answer->handle($game, $request->user(), $joinRequest, approve: true);

        return GameController::lobby($game);
    }

    public function decline(Request $request, string $code, int $joinRequest, AnswerJoinRequest $answer): GameResource
    {
        $game = GameController::member($request, $code);
        $answer->handle($game, $request->user(), $joinRequest, approve: false);

        return GameController::lobby($game);
    }

    /**
     * Not a member yet, so the game is found by code alone.
     */
    public function requestToJoin(Request $request, string $code, RequestToJoin $requestToJoin): JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();
        $requestToJoin->handle($game, $request->user());

        return response()->json([
            'status' => JoinOutcome::Requested,
            'code' => $game->code,
            'title' => $game->title,
            'game_type' => $game->game_type,
        ], 201);
    }

    public function cancelRequest(Request $request, string $code, RequestToJoin $requestToJoin): Response
    {
        $requestToJoin->cancel(Game::where('code', $code)->firstOrFail(), $request->user());

        return response()->noContent();
    }

    public function close(Request $request, string $code, CloseGame $closeGame): Response
    {
        $closeGame->handle(GameController::member($request, $code), $request->user());

        return response()->noContent();
    }

    public function cancelInvitation(Request $request, string $code, int $invitation, CancelInvitation $cancel): GameResource
    {
        $game = GameController::member($request, $code);
        $cancel->handle($game, $request->user(), $invitation);

        return GameController::lobby($game);
    }
}
