<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Support\LiveKit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Hands a player of a game what their app needs to join its voice room.
 * Shared by the web app (by game id) and the mobile API (by invite code).
 */
class VoiceController extends Controller
{
    public function show(Request $request, Game $game): JsonResponse
    {
        return $this->tokenResponse($request, $game);
    }

    public function showByCode(Request $request, string $code): JsonResponse
    {
        return $this->tokenResponse($request, Game::where('code', $code)->firstOrFail());
    }

    /** Who is talking in the game's voice room, without joining it. */
    public function participants(Request $request, Game $game): JsonResponse
    {
        abort_unless(LiveKit::enabled(), 404, __('Voice chat is not set up.'));
        abort_unless($game->hasPlayer($request->user()), 403);

        return response()->json(LiveKit::participants($game));
    }

    public function participantsByCode(Request $request, string $code): JsonResponse
    {
        return $this->participants($request, Game::where('code', $code)->firstOrFail());
    }

    private function tokenResponse(Request $request, Game $game): JsonResponse
    {
        abort_unless(LiveKit::enabled(), 404, __('Voice chat is not set up.'));
        abort_unless($game->players()->where('user_id', $request->user()->id)->exists(), 403);

        return response()->json([
            'url' => LiveKit::url(),
            'token' => LiveKit::tokenFor($request->user(), $game),
            'room' => LiveKit::roomFor($game),
        ]);
    }
}
