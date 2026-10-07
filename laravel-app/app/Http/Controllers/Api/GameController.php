<?php

namespace App\Http\Controllers\Api;

use App\Actions\Games\CastVote;
use App\Actions\Games\CreateGame;
use App\Actions\Games\GuessLocation;
use App\Actions\Games\JoinGame;
use App\Actions\Games\LeaveGame;
use App\Actions\Games\ResetGame;
use App\Actions\Games\StartRound;
use App\Actions\Games\StartVoting;
use App\Actions\Games\TallyVotes;
use App\Actions\Games\ToggleReady;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Queries\SpyHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
        $game = $this->member($request, $code);

        return $this->lobby($game);
    }

    public function join(Request $request, string $code, JoinGame $joinGame): GameResource
    {
        $game = Game::where('code', $code)->firstOrFail();

        return $this->lobby($joinGame->handle($game, $request->user()));
    }

    public function leave(Request $request, string $code, LeaveGame $leaveGame): Response
    {
        $leaveGame->handle($this->member($request, $code), $request->user());

        return response()->noContent();
    }

    public function ready(Request $request, string $code, ToggleReady $toggleReady): GameResource
    {
        $game = $this->member($request, $code);
        $toggleReady->handle($game, $request->user());

        return $this->lobby($game);
    }

    public function start(Request $request, string $code, StartRound $startRound): GameResource
    {
        $game = $this->member($request, $code);
        $startRound->handle($game, $request->user());

        return $this->lobby($game);
    }

    public function voting(Request $request, string $code, StartVoting $startVoting): GameResource
    {
        $game = $this->member($request, $code);
        $startVoting->handle($game, $request->user());

        return $this->lobby($game);
    }

    public function vote(Request $request, string $code, CastVote $castVote): GameResource
    {
        $game = $this->member($request, $code);
        $validated = $request->validate(['suspect_id' => ['required', 'integer']]);
        $castVote->handle($game, $request->user(), (int) $validated['suspect_id']);

        return $this->lobby($game);
    }

    public function tally(Request $request, string $code, TallyVotes $tallyVotes): GameResource
    {
        $game = $this->member($request, $code);
        $tallyVotes->handle($game, $request->user());

        return $this->lobby($game);
    }

    public function guess(Request $request, string $code, GuessLocation $guessLocation): JsonResponse
    {
        $game = $this->member($request, $code);
        $validated = $request->validate(['location_id' => ['required', 'integer']]);
        $correct = $guessLocation->handle($game, $request->user(), (int) $validated['location_id']);

        return response()->json([
            'correct' => $correct,
            'game' => $this->lobby($game),
        ]);
    }

    public function reset(Request $request, string $code, ResetGame $resetGame): GameResource
    {
        $game = $this->member($request, $code);
        $resetGame->handle($game, $request->user());

        return $this->lobby($game);
    }

    /**
     * Resolves a game the requesting user belongs to; anyone else gets 403.
     */
    protected function member(Request $request, string $code): Game
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->hasPlayer($request->user()), 403);

        return $game;
    }

    protected function lobby(Game $game): GameResource
    {
        return GameResource::make($game->refresh()->load(['host', 'players.user', 'currentRound.votes']));
    }
}
