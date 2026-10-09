<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class StartVoting
{
    /**
     * @param  User|null  $host  null when the round timer calls the vote
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, ?User $host = null): void
    {
        if ($host) {
            abort_unless($game->isHost($host), 403);
        }

        $game->ensureType(GameType::Spy);

        DB::transaction(function () use ($game, $host) {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                // The timer can lose a race with the host: nothing to do.
                if ($host === null) {
                    return;
                }

                throw new GameRuleException('game', __('Voting can only start during an active round.'));
            }

            $game->currentRound()->firstOrFail()->update(['voting_started_at' => now()]);
            $game->update(['status' => GameStatus::Voting]);
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
