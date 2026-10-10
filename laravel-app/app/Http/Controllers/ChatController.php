<?php

namespace App\Http\Controllers;

use App\Events\ChatMessagePosted;
use App\Models\Game;
use App\Models\GameMessage;
use App\Support\BestEffortBroadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Text chat in a game's lobby, for its players. Shared by the web app (by
 * game) and the mobile API (by invite code); both get JSON.
 */
class ChatController extends Controller
{
    public function index(Request $request, Game $game): JsonResponse
    {
        abort_unless($game->hasPlayer($request->user()), 403);

        return response()->json(GameMessage::recentFor($game));
    }

    public function indexByCode(Request $request, string $code): JsonResponse
    {
        return $this->index($request, Game::where('code', $code)->firstOrFail());
    }

    public function store(Request $request, Game $game): JsonResponse
    {
        abort_unless($game->hasPlayer($request->user()), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:'.GameMessage::MAX_LENGTH],
        ]);

        $message = GameMessage::create([
            'game_id' => $game->id,
            'user_id' => $request->user()->id,
            'body' => trim($validated['body']),
        ]);
        $message->setRelation('user', $request->user());

        BestEffortBroadcast::dispatch(new ChatMessagePosted($message));

        return response()->json($message->present(), 201);
    }

    public function storeByCode(Request $request, string $code): JsonResponse
    {
        return $this->store($request, Game::where('code', $code)->firstOrFail());
    }
}
