<?php

namespace App\Http\Controllers;

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Response;
use Throwable;

class InvitationController extends Controller
{
    public function index(Request $request, Game $game): Response
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $rosterUserIds = $game->players()->pluck('user_id');
        $pendingInviteeIds = $game->invitations()->where('status', 'pending')->pluck('to_user_id');

        $users = User::query()
            ->where('id', '!=', $request->user()->id)
            ->whereNotIn('id', $rosterUserIds)
            ->orderBy('name')
            ->get(['id', 'name', 'codename'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'invite_status' => $pendingInviteeIds->contains($user->id) ? 'pending' : null,
            ]);

        return inertia('games/InviteUsers', [
            'game' => $game->only(['id', 'code', 'title']),
            'users' => $users,
        ]);
    }

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

        // The invitation is already saved at this point — a broadcast failure
        // (e.g. Pusher unreachable, misconfigured, or a network/TLS error) is
        // a best-effort delivery problem, not a reason to fail the whole
        // request. Pusher's SDK only wraps API-level errors (bad credentials,
        // rate limits) in BroadcastException; raw connectivity failures
        // surface as GuzzleHttp exceptions instead, so this catches broadly.
        try {
            broadcast(new InvitationSent($invitation));
        } catch (Throwable $e) {
            report($e);
        }

        return back();
    }

    public function accept(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        if ($invitation->status !== 'pending') {
            return back()->withErrors(['invitation' => 'This invitation is no longer available.']);
        }

        $game = $invitation->game;

        if ($game->status !== 'recruiting') {
            return back()->withErrors(['invitation' => 'This operation is no longer recruiting.']);
        }

        // Mirrors GameController::join()'s already-joined guard: a user who
        // joined by code after being invited should have their invitation
        // resolved gracefully, not hit the game_players unique constraint.
        $alreadyJoined = $game->players()->where('user_id', $request->user()->id)->exists();

        if (! $alreadyJoined && $game->players()->count() >= $game->max_players) {
            return back()->withErrors(['invitation' => 'This operation roster is already full.']);
        }

        DB::transaction(function () use ($alreadyJoined, $game, $request, $invitation): void {
            if (! $alreadyJoined) {
                GamePlayer::create([
                    'game_id' => $game->id,
                    'user_id' => $request->user()->id,
                    'is_host' => false,
                    'status' => 'ready',
                    'joined_at' => now(),
                ]);
            }

            $invitation->update(['status' => 'accepted']);
        });

        return to_route('games.show', $game);
    }

    public function decline(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        if ($invitation->status === 'pending') {
            $invitation->update(['status' => 'declined']);
        }

        return to_route('dashboard');
    }
}
