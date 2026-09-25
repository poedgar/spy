<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return inertia('Dashboard');
    }

    public function spy(Request $request): Response
    {
        $games = $request->user()
            ->gamePlayers()
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();

        $pendingInvitations = $request->user()
            ->receivedInvitations()
            ->where('status', 'pending')
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game:id,title,code', 'fromUser:id,codename')
            ->get()
            ->map(fn (Invitation $invitation) => [
                'id' => $invitation->id,
                'game_title' => $invitation->game->title,
                'game_code' => $invitation->game->code,
                'from_codename' => $invitation->fromUser->codename,
            ]);

        return inertia('games/Spy', [
            'games' => $games,
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
}
