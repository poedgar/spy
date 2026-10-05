<?php

namespace App\Http\Controllers\Api;

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Queries\SpyHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function spy(Request $request, SpyHomeQuery $spyHome): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($spyHome->games($request->user())),
            'pending_invitations' => InvitationResource::collection($spyHome->pendingInvitations($request->user())),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return $this->lobby($game)->response()->setStatusCode(201);
    }

    public function show(Request $request, string $code): GameResource
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->players()->where('user_id', $request->user()->id)->exists(), 403);

        return $this->lobby($game);
    }

    public function join(Request $request, string $code, JoinGame $joinGame): GameResource
    {
        $game = Game::where('code', $code)->firstOrFail();

        return $this->lobby($joinGame->handle($game, $request->user()));
    }

    protected function lobby(Game $game): GameResource
    {
        return GameResource::make($game->load(['host', 'players.user']));
    }
}
