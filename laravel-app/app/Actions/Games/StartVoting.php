<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class StartVoting
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): void
    {
        abort_unless($game->isHost($host), 403);

        DB::transaction(function () use ($game) {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('game', __('Voting can only start during an active round.'));
            }

            $game->currentRound()->firstOrFail()->update(['voting_started_at' => now()]);
            $game->update(['status' => GameStatus::Voting]);
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
