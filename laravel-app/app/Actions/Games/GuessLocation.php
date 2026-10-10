<?php

namespace App\Actions\Games;

use App\Enums\GameType;
use App\Enums\RoundEnding;
use App\Enums\Team;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\LocationCatalog;
use Illuminate\Support\Facades\DB;

/**
 * A spy stakes the round on naming the location: right and the spies win,
 * wrong and the loyalists do. One guess per round, since any guess ends it.
 */
class GuessLocation
{
    public function __construct(private EndRound $endRound) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $spy, int $locationId): bool
    {
        abort_unless($game->hasPlayer($spy), 403);
        $game->ensureType(GameType::Spy);

        if (LocationCatalog::find($locationId) === null) {
            throw new GameRuleException('location_id', __('Unknown location.'));
        }

        $correct = DB::transaction(function () use ($game, $spy, $locationId): bool {
            $game = $game->freshLocked();

            if (! $game->status->inRound()) {
                throw new GameRuleException('location_id', __('There is no round in progress.'));
            }

            $round = $game->currentRound()->firstOrFail();

            if (! $round->isSpy($spy)) {
                throw new GameRuleException('location_id', __('Only a spy can guess the location.'));
            }

            $correct = $round->location_id === $locationId;

            $this->endRound->handle($game, $round, RoundEnding::SpyGuess, [
                'winning_team' => $correct ? Team::Spies : Team::Loyalists,
                'guessed_by_user_id' => $spy->id,
                'guessed_location_id' => $locationId,
            ], $spy->id);

            return $correct;
        });

        $this->endRound->broadcast($game);

        return $correct;
    }
}
