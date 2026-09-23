<?php

namespace App\Http\Controllers;

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\Invitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function store(Request $request, Game $game): RedirectResponse
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $toUserId = (int) $validated['to_user_id'];

        if ($toUserId === $request->user()->id) {
            return back()->withErrors(['to_user_id' => 'You cannot invite yourself.']);
        }

        if ($game->players()->where('user_id', $toUserId)->exists()) {
            return back()->withErrors(['to_user_id' => 'That operative is already in this operation.']);
        }

        if ($game->players()->count() >= $game->max_players) {
            return back()->withErrors(['to_user_id' => 'This operation roster is already full.']);
        }

        $invitation = Invitation::updateOrCreate(
            ['game_id' => $game->id, 'to_user_id' => $toUserId],
            ['from_user_id' => $request->user()->id, 'status' => 'pending'],
        );

        broadcast(new InvitationSent($invitation));

        return back();
    }
}
