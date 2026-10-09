<?php

namespace App\Http\Controllers\Api;

use App\Actions\Games\CastVote;
use App\Actions\Games\CreateGame;
use App\Actions\Games\EnforceRoundTimer;
use App\Actions\Games\GuessLocation;
use App\Actions\Games\LeaveGame;
use App\Actions\Games\ResetGame;
use App\Actions\Games\StartRound;
use App\Actions\Games\StartVoting;
use App\Actions\Games\TallyVotes;
use App\Actions\Games\ToggleReady;
use App\Actions\Lobby\JoinByCode;
use App\Enums\JoinOutcome;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Queries\GameHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class GameController extends Controller
{
    public function spy(Request $request, GameHomeQuery $home): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($home->games($request->user())),
            'open_games' => $home->openGames($request->user()),
            'pending_invitations' => InvitationResource::collection($home->pendingInvitations($request->user())),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return self::lobby($game)->response()->setStatusCode(201);
    }

    public function show(Request $request, string $code): GameResource
    {
        $game = self::member($request, $code);

        return self::lobby($game);
    }

    /**
     * Joined: the lobby. Waiting on the host's approval: 202 with just
     * enough to tell the player where they asked to go.
     */
    public function join(Request $request, string $code, JoinByCode $joinByCode): GameResource|JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();

        if ($joinByCode->handle($game, $request->user()) === JoinOutcome::Requested) {
            return response()->json([
                'status' => JoinOutcome::Requested,
                'code' => $game->code,
                'title' => $game->title,
                'game_type' => $game->game_type,
            ], 202);
        }

        return self::lobby($game);
    }

    public function leave(Request $request, string $code, LeaveGame $leaveGame): Response
    {
        $leaveGame->handle(self::member($request, $code), $request->user());

        return response()->noContent();
    }

    public function ready(Request $request, string $code, ToggleReady $toggleReady): GameResource
    {
        $game = self::member($request, $code);
        $toggleReady->handle($game, $request->user());

        return self::lobby($game);
    }

    public function start(Request $request, string $code, StartRound $startRound): GameResource
    {
        $game = self::member($request, $code);
        $startRound->handle($game, $request->user());

        return self::lobby($game);
    }

    public function voting(Request $request, string $code, StartVoting $startVoting): GameResource
    {
        $game = self::member($request, $code);
        $startVoting->handle($game, $request->user());

        return self::lobby($game);
    }

    public function vote(Request $request, string $code, CastVote $castVote): GameResource
    {
        $game = self::member($request, $code);
        $validated = $request->validate(['suspect_id' => ['required', 'integer']]);
        $castVote->handle($game, $request->user(), (int) $validated['suspect_id']);

        return self::lobby($game);
    }

    public function tally(Request $request, string $code, TallyVotes $tallyVotes): GameResource
    {
        $game = self::member($request, $code);
        $tallyVotes->handle($game, $request->user());

        return self::lobby($game);
    }

    public function guess(Request $request, string $code, GuessLocation $guessLocation): JsonResponse
    {
        $game = self::member($request, $code);
        $validated = $request->validate(['location_id' => ['required', 'integer']]);
        $correct = $guessLocation->handle($game, $request->user(), (int) $validated['location_id']);

        return response()->json([
            'correct' => $correct,
            'game' => self::lobby($game),
        ]);
    }

    public function reset(Request $request, string $code, ResetGame $resetGame): GameResource
    {
        $game = self::member($request, $code);
        $resetGame->handle($game, $request->user());

        return self::lobby($game);
    }

    /**
     * Resolves a game the requesting user belongs to; anyone else gets 403.
     */
    public static function member(Request $request, string $code): Game
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->hasPlayer($request->user()), 403);

        return $game;
    }

    /**
     * The caller's view of a lobby, shared by every game's endpoints.
     */
    public static function lobby(Game $game): GameResource
    {
        app(EnforceRoundTimer::class)->handle($game->refresh());

        return GameResource::make($game->refresh()->load(Game::LOBBY_RELATIONS));
    }
}
