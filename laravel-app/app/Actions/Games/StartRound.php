<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Events\RoundStarted;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GameRound;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use App\Support\LocationCatalog;
use Illuminate\Support\Facades\DB;

/**
 * Deals a round: draws a location from the game's age tier and secretly
 * picks the spies. Used both to launch a recruiting game and to play the
 * next round after one completes; scores carry over.
 */
class StartRound
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): GameRound
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureType(GameType::Spy);

        $round = DB::transaction(function () use ($game): GameRound {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('A round is already in progress.'));
            }

            $playerIds = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            if ($playerIds->count() < $game->game_type->minPlayers()) {
                throw new GameRuleException('game', __('At least :count operatives are required to start.', ['count' => $game->game_type->minPlayers()]));
            }

            $previous = $game->currentRound()->first();

            $round = $game->rounds()->create([
                'number' => ($previous->number ?? 0) + 1,
                'location_id' => $this->drawLocation($game, $previous),
                'spy_user_ids' => $playerIds->shuffle()->take(Game::spyCountFor($playerIds->count()))->values()->all(),
                'started_at' => now(),
                'ends_at' => $game->round_seconds ? now()->addSeconds($game->round_seconds) : null,
            ]);

            $game->update(['status' => GameStatus::Active]);

            return $round;
        });

        RoundStarted::dispatch($game, $round->number);
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));

        return $round;
    }

    /**
     * Avoids dealing the same location twice in a row.
     */
    private function drawLocation(Game $game, ?GameRound $previous): int
    {
        do {
            $locationId = LocationCatalog::randomId($game->age_tier);
        } while ($previous && $locationId === $previous->location_id && count(LocationCatalog::forTier($game->age_tier)) > 1);

        return $locationId;
    }
}
