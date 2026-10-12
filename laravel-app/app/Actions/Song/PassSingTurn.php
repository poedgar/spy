<?php

namespace App\Actions\Song;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Notifications\YourTurnToSing;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * The singer (or the host, for someone who wandered off) finishes a turn.
 * After the last singer the table votes.
 */
class PassSingTurn
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): void
    {
        abort_unless($game->hasPlayer($user), 403);
        $game->ensureType(GameType::Song);

        $next = DB::transaction(function () use ($game, $user): ?int {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('game', __('There is no round in progress.'));
            }

            $round = $game->currentSongRound()->firstOrFail();

            if (! $game->isHost($user) && $round->singerId() !== $user->id) {
                throw new GameRuleException('game', __('Only the singer or the host can end this turn.'));
            }

            $round->increment('turn_index');

            if ($round->everyoneSang()) {
                $round->update(['voting_started_at' => now()]);
                $game->update(['status' => GameStatus::Voting]);

                return null;
            }

            return $round->singerId();
        });

        if ($next !== null && $next !== $user->id) {
            User::find($next)?->notify(new YourTurnToSing($game));
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
