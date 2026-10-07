<?php

namespace App\Http\Controllers;

use App\Http\Resources\GameResource;
use App\Models\Invitation;
use App\Queries\SpyHomeQuery;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return inertia('Dashboard');
    }

    public function spy(Request $request, SpyHomeQuery $spyHome): Response
    {
        $pendingInvitations = $spyHome->pendingInvitations($request->user())
            ->map(fn (Invitation $invitation) => [
                'id' => $invitation->id,
                'game_title' => $invitation->game->title,
                'game_code' => $invitation->game->code,
                'from_codename' => $invitation->fromUser->codename,
            ]);

        return inertia('games/Spy', [
            'games' => GameResource::collection($spyHome->games($request->user()))->resolve($request),
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
}
