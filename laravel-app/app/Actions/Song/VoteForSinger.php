<?php

namespace App\Actions\Song;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * A player picks the best performance (not their own). Votes can change
 * until the vote closes, which happens once everyone has voted.
 */
class VoteForSinger
{
    public function __construct(private CloseSongVoting $close) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $voter, int $singerId): void
    {
        abort_unless($game->hasPlayer($voter), 403);
        $game->ensureType(GameType::Song);

        $everyoneVoted = DB::transaction(function () use ($game, $voter, $singerId): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Voting) {
                throw new GameRuleException('singer', __('Voting is not open.'));
            }

            $round = $game->currentSongRound()->firstOrFail();

            if ($singerId === $voter->id) {
                throw new GameRuleException('singer', __('Vote for someone else.'));
            }

            if (! in_array($singerId, $round->turn_order, true)) {
                throw new GameRuleException('singer', __('That player did not sing this round.'));
            }

            $votes = $round->votes ?? [];
            $votes[$voter->id] = $singerId;
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
