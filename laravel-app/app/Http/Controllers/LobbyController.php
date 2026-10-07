<?php

namespace App\Http\Controllers;

use App\Actions\Invitations\CancelInvitation;
use App\Actions\Lobby\AnswerJoinRequest;
use App\Actions\Lobby\RemovePlayer;
use App\Actions\Lobby\TransferHost;
use App\Actions\Lobby\UpdateGameSettings;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The host's lobby controls, shared by both games.
 */
class LobbyController extends Controller
{
    public function settings(Request $request, Game $game, UpdateGameSettings $updateSettings): RedirectResponse
    {
        $updateSettings->handle($game, $request->user(), $request->validate([
            'requires_approval' => ['required', 'boolean'],
        ]));

        return back();
    }

    public function removePlayer(Request $request, Game $game, int $user, RemovePlayer $removePlayer): RedirectResponse
    {
        $removePlayer->handle($game, $request->user(), $user);

        return back();
    }

    public function transferHost(Request $request, Game $game, TransferHost $transferHost): RedirectResponse
    {
        $validated = $request->validate(['user_id' => ['required', 'integer']]);
        $transferHost->handle($game, $request->user(), (int) $validated['user_id']);

        return back();
    }

    public function approve(Request $request, Game $game, int $joinRequest, AnswerJoinRequest $answer): RedirectResponse
    {
        $answer->handle($game, $request->user(), $joinRequest, approve: true);

        return back();
    }

    public function decline(Request $request, Game $game, int $joinRequest, AnswerJoinRequest $answer): RedirectResponse
    {
        $answer->handle($game, $request->user(), $joinRequest, approve: false);

        return back();
    }

    public function cancelInvitation(Request $request, Game $game, int $invitation, CancelInvitation $cancel): RedirectResponse
    {
        $cancel->handle($game, $request->user(), $invitation);

        return back();
    }
}
