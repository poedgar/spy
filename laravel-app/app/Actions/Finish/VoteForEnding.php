<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * A player picks the best ending (not their own) by its place in the list:
 * endings stay nameless until the vote closes. Votes can change until then;
 * it closes once everyone has voted.
 */
class VoteForEnding
{
    public function __construct(private CloseFinishVoting $close) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $voter, int $position): void
    {
        abort_unless($game->hasPlayer($voter), 403);
        $game->ensureType(GameType::Finish);

        $everyoneVoted = DB::transaction(function () use ($game, $voter, $position): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Voting) {
                throw new GameRuleException('answer', __('Voting is not open.'));
            }

            $round = $game->currentFinishRound()->firstOrFail();
            $authorId = $round->authorAt($position);

            if ($authorId === null) {
                throw new GameRuleException('answer', __('There is no such ending.'));
            }

            if ($authorId === $voter->id) {
                throw new GameRuleException('answer', __('Vote for someone else’s ending.'));
            }

            $votes = $round->votes ?? [];
            $votes[$voter->id] = $authorId;
            $round->update(['votes' => $votes]);

            $voters = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            return $voters->every(fn (int $id) => array_key_exists($id, $votes));
        });

        if ($everyoneVoted) {
            $this->close->handle($game, $voter, byHost: false);

            return;
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
