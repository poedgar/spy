<?php

namespace App\Http\Controllers;

use App\Enums\GameType;
use App\Http\Resources\GameResource;
use App\Models\Invitation;
use App\Queries\GameHomeQuery;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return inertia('Dashboard');
    }

    public function spy(Request $request, GameHomeQuery $home): Response
    {
        return inertia('games/Spy', $this->homeProps($request, $home, GameType::Spy));
    }

    public function phrase(Request $request, GameHomeQuery $home): Response
    {
        return inertia('games/Phrase', $this->homeProps($request, $home, GameType::Phrase));
    }

    /**
     * @return array<string, mixed>
     */
    private function homeProps(Request $request, GameHomeQuery $home, GameType $type): array
    {
        return [
            'games' => GameResource::collection($home->games($request->user(), $type))->resolve($request),
            'openGames' => $home->openGames($request->user(), $type),
            'pendingInvitations' => $home->pendingInvitations($request->user(), $type)
                ->map(fn (Invitation $invitation) => [
                    'id' => $invitation->id,
                    'game_title' => $invitation->game->title,
                    'game_code' => $invitation->game->code,
                    'from_codename' => $invitation->fromUser->codename,
                ]),
        ];
    }
}
