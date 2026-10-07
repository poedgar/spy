<?php

namespace App\Http\Controllers;

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
    public function show(Request $request, Game $game): Response
    {
        abort_unless($game->isHost($request->user()) || $game->hasPlayer($request->user()), 403);

        $game->load(['host', 'players.user', 'currentRound.votes']);

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

    public function join(Request $request, string $code, JoinGame $joinGame): RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        if (! $game) {
            return back()->withErrors(['code' => __('No operation found with that invite code.')]);
        }

        $joinGame->handle($game, $request->user());

        return to_route('games.show', $game);
    }

    public function leave(Request $request, Game $game, LeaveGame $leaveGame): RedirectResponse
    {
        $leaveGame->handle($game, $request->user());

        return to_route('games.spy');
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
