<?php

namespace App\Http\Controllers\Api;

use App\Actions\Invitations\CancelInvitation;
use App\Actions\Lobby\AnswerJoinRequest;
use App\Actions\Lobby\RemovePlayer;
use App\Actions\Lobby\TransferHost;
use App\Actions\Lobby\UpdateGameSettings;
use App\Http\Controllers\Controller;
use App\Http\Resources\GameResource;
use Illuminate\Http\Request;

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
            'requires_approval' => ['required', 'boolean'],
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

    public function cancelInvitation(Request $request, string $code, int $invitation, CancelInvitation $cancel): GameResource
    {
        $game = GameController::member($request, $code);
        $cancel->handle($game, $request->user(), $invitation);

        return GameController::lobby($game);
    }
}
