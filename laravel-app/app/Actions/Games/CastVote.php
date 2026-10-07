<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\RoundVote;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Records (or changes) a vote. Once every operative has voted the round is
 * tallied straight away, so nobody has to wait on the host.
 */
class CastVote
{
    public function __construct(private TallyVotes $tally) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $voter, int $suspectId): void
    {
        abort_unless($game->hasPlayer($voter), 403);

        if ($suspectId === $voter->id) {
            throw new GameRuleException('suspect_id', __('You cannot vote for yourself.'));
        }

        if (! $game->hasPlayer($suspectId)) {
            throw new GameRuleException('suspect_id', __('That operative is not in this operation.'));
        }

        $everyoneVoted = DB::transaction(function () use ($game, $voter, $suspectId): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Voting) {
                throw new GameRuleException('suspect_id', __('Voting is not open.'));
            }

            $round = $game->currentRound()->firstOrFail();

            RoundVote::updateOrCreate(
                ['game_round_id' => $round->id, 'voter_id' => $voter->id],
                ['suspect_id' => $suspectId],
            );

            return $round->votes()->count() >= $game->players()->count();
        });

        if ($everyoneVoted) {
            $this->tally->handle($game);

            return;
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
