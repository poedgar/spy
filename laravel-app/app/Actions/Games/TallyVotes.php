<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\RoundEnding;
use App\Enums\Team;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Closes voting. The operative with the most votes is accused; the
 * loyalists win only if that operative is a spy. A tie for the most votes
 * (or no votes at all) means the table never agreed, and the spies win.
 */
class TallyVotes
{
    public function __construct(private EndRound $endRound) {}

    /**
     * @param  User|null  $host  null when the last vote triggers the tally
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, ?User $host = null): void
    {
        if ($host) {
            abort_unless($game->isHost($host), 403);
        }

        $game->ensureType(GameType::Spy);

        $ended = DB::transaction(function () use ($game): bool {
            $game = $game->freshLocked();

            // A host's tally can cross the automatic one: whoever loses the
            // lock finds the round already over.
            if ($game->status !== GameStatus::Voting) {
                return false;
            }

            $round = $game->currentRound()->firstOrFail();

            $counts = $round->votes()
                ->selectRaw('suspect_id, count(*) as total')
                ->groupBy('suspect_id')
                ->orderByDesc('total')
                ->pluck('total', 'suspect_id')
                ->map(fn ($total) => (int) $total);

            $topCount = $counts->first();
            $leaders = $counts->filter(fn ($total) => $total === $topCount)->keys();
            $accusedId = $leaders->count() === 1 ? (int) $leaders->first() : null;

            $this->endRound->handle($game, $round, RoundEnding::Vote, [
                'winning_team' => $accusedId !== null && $round->isSpy($accusedId) ? Team::Loyalists : Team::Spies,
                'accused_user_id' => $accusedId,
            ]);

            return true;
        });

        if (! $ended && $host) {
            throw new GameRuleException('game', __('Voting is not open.'));
        }

        if ($ended) {
            $this->endRound->broadcast($game);
        }
    }
}
