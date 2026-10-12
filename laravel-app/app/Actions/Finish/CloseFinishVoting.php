<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\FinishRound;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Support\BestEffortBroadcast;
use App\Support\GameNews;
use Illuminate\Support\Facades\DB;

/**
 * Counts the votes: the most-voted ending wins its author a point, and a tie
 * rewards everyone tied. With no votes at all, nobody scores.
 */
class CloseFinishVoting
{
    /** Points for the best ending. */
    public const WIN_POINTS = 1;

    /**
     * @param  bool  $byHost  the host closing early (else the last vote did)
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, User $actor, bool $byHost = true): void
    {
        $game->ensureType(GameType::Finish);

        if ($byHost) {
            abort_unless($game->isHost($actor), 403);
        }

        $closed = DB::transaction(function () use ($game, $actor): bool {
            $game = $game->freshLocked();

            // A host's close can cross the last vote: whoever loses finds it done.
            if ($game->status !== GameStatus::Voting) {
                return false;
            }

            $round = $game->currentFinishRound()->firstOrFail();
            $tally = $round->tally();
            $top = max($tally ?: [0]);
            $winners = $top > 0 ? array_keys(array_filter($tally, fn (int $votes) => $votes === $top)) : [];
            sort($winners);

            if ($winners !== []) {
                GamePlayer::where('game_id', $game->id)->whereIn('user_id', $winners)->increment('score', self::WIN_POINTS);
            }

            $round->update([
                'ended_at' => now(),
                'ending' => FinishRound::ENDING_VOTED,
                'winner_user_ids' => $winners,
            ]);
            $game->update(['status' => GameStatus::Completed]);

            GameNews::toPlayers($game, new RoundEnded($game, [
                'number' => $round->number,
                'finish_winners' => User::whereIn('id', $winners)->pluck('codename')->implode(', ') ?: null,
            ]), $actor->id);

            return true;
        });

        if (! $closed && $byHost) {
            throw new GameRuleException('game', __('Voting is not open.'));
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
