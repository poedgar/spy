<?php

namespace App\Actions\Games;

use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class LeaveGame
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): void
    {
        abort_unless($game->hasPlayer($user), 403);

        if ($game->isHost($user)) {
            throw new GameRuleException('game', __('The host cannot leave their own operation.'));
        }

        DB::transaction(function () use ($game, $user) {
            $game = $game->freshLocked();

            // Roles are dealt per roster, so nobody may slip out mid-round.
            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('You cannot leave while a round is in progress.'));
            }

            GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->delete();
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
