<?php

namespace App\Http\Controllers\Api;

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Http\Controllers\Controller;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Models\Invitation;
use App\Queries\InvitableUsersQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvitationController extends Controller
{
    public function invitable(Request $request, string $code, InvitableUsersQuery $invitableUsers): JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        return response()->json($invitableUsers->for($game, $request->user()));
    }

    public function store(Request $request, string $code, SendInvitation $sendInvitation): JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $invitation = $sendInvitation->handle($game, $request->user(), (int) $validated['to_user_id']);

        return InvitationResource::make($invitation->load(['game', 'fromUser']))
            ->response()->setStatusCode(201);
    }

    public function accept(Request $request, Invitation $invitation, AcceptInvitation $acceptInvitation): GameResource
    {
        $game = $acceptInvitation->handle($invitation, $request->user());

        return GameResource::make($game->load(['host', 'players.user']));
    }

    public function decline(Request $request, Invitation $invitation, DeclineInvitation $declineInvitation): Response
    {
        $declineInvitation->handle($invitation, $request->user());

        return response()->noContent();
    }
}
