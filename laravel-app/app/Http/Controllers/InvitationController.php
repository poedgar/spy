<?php

namespace App\Http\Controllers;

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\Invitation;
use App\Queries\InvitableUsersQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class InvitationController extends Controller
{
    public function index(Request $request, Game $game, InvitableUsersQuery $invitableUsers): Response
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === GameStatus::Recruiting, 403);

        return inertia('games/InviteUsers', [
            'game' => $game->only(['id', 'code', 'title']),
            'users' => $invitableUsers->for($game, $request->user()),
        ]);
    }

    public function store(Request $request, Game $game, SendInvitation $sendInvitation): RedirectResponse
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === GameStatus::Recruiting, 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $sendInvitation->handle($game, $request->user(), (int) $validated['to_user_id']);

        return back();
    }

    public function accept(Request $request, Invitation $invitation, AcceptInvitation $acceptInvitation): RedirectResponse
    {
        $game = $acceptInvitation->handle($invitation, $request->user());

        return to_route('games.show', $game);
    }

    public function decline(Request $request, Invitation $invitation, DeclineInvitation $declineInvitation): RedirectResponse
    {
        $declineInvitation->handle($invitation, $request->user());

        return to_route('games.spy');
    }
}
