<?php

namespace App\Http\Controllers;

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
use App\Enums\GameType;
use App\Enums\JoinOutcome;
use App\Http\Requests\StoreGameRequest;
use App\Http\Resources\GameResource;
use App\Models\Game;
use App\Support\LocationCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    public function show(Request $request, string $code, EnforceRoundTimer $enforceTimer): Response|RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        // Closed (deleted) while someone had it open: back to the games list.
        if ($game === null) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('That game is no longer available.')]);

            return to_route('dashboard');
        }

        // Someone removed, or who left in another tab, lands back on the
        // game's home with an explanation rather than an error page.
        if (! $game->isHost($request->user()) && ! $game->hasPlayer($request->user())) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('You are not in that game. Join it with its invite code.')]);

            return to_route(self::homeRoute($game));
        }

        $enforceTimer->handle($game);
        $game->refresh()->load(Game::LOBBY_RELATIONS);

        if ($game->game_type === GameType::Phrase) {
            return inertia('games/PhraseLobby', [
                'game' => GameResource::make($game)->resolve($request),
            ]);
        }

        return inertia('games/Lobby', [
            'game' => GameResource::make($game)->resolve($request),
            // The guide and the spy's guess list; it never changes for a
            // game, so partial reloads of the lobby skip it.
            'locations' => Inertia::once(fn () => LocationCatalog::presentTier($game->age_tier))
                ->as("locations.{$game->age_tier->value}"),
            'categories' => LocationCatalog::categories(),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function join(Request $request, string $code, JoinByCode $joinByCode): RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        if (! $game) {
            return back()->withErrors(['code' => __('No operation found with that invite code.')]);
        }

        if ($joinByCode->handle($game, $request->user()) === JoinOutcome::Requested) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Request sent. The host will let you in.')]);

            return back();
        }

        return to_route('games.show', $game);
    }

    public static function homeRoute(Game $game): string
    {
        return $game->game_type === GameType::Phrase ? 'games.phrase' : 'games.spy';
    }

    public function leave(Request $request, Game $game, LeaveGame $leaveGame): RedirectResponse
    {
        $leaveGame->handle($game, $request->user());

        return to_route(self::homeRoute($game));
    }

    public function ready(Request $request, Game $game, ToggleReady $toggleReady): RedirectResponse
    {
        $toggleReady->handle($game, $request->user());

        return back();
    }

    public function start(Request $request, Game $game, StartRound $startRound): RedirectResponse
    {
        $startRound->handle($game, $request->user());

        return back();
    }

    public function voting(Request $request, Game $game, StartVoting $startVoting): RedirectResponse
    {
        $startVoting->handle($game, $request->user());

        return back();
    }

    public function vote(Request $request, Game $game, CastVote $castVote): RedirectResponse
    {
        $validated = $request->validate(['suspect_id' => ['required', 'integer']]);
        $castVote->handle($game, $request->user(), (int) $validated['suspect_id']);

        return back();
    }

    public function tally(Request $request, Game $game, TallyVotes $tallyVotes): RedirectResponse
    {
        $tallyVotes->handle($game, $request->user());

        return back();
    }

    public function guess(Request $request, Game $game, GuessLocation $guessLocation): RedirectResponse
    {
        $validated = $request->validate(['location_id' => ['required', 'integer']]);
        $guessLocation->handle($game, $request->user(), (int) $validated['location_id']);

        return back();
    }

    public function reset(Request $request, Game $game, ResetGame $resetGame): RedirectResponse
    {
        $resetGame->handle($game, $request->user());

        return back();
    }
}
