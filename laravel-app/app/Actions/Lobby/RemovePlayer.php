<?php

namespace App\Actions\Lobby;

use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class RemovePlayer
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $userId): void
    {
        abort_unless($game->isHost($host), 403);

        if ($userId === $host->id) {
            throw new GameRuleException('game', __('Use Leave to step away from your own game.'));
        }

        DB::transaction(function () use ($game, $userId) {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('Players can only be removed between rounds.'));
            }

            abort_unless($game->hasPlayer($userId), 404);

            GamePlayer::where('game_id', $game->id)->where('user_id', $userId)->delete();
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
