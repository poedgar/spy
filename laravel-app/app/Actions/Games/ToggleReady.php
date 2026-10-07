<?php

namespace App\Actions\Games;

use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class ToggleReady
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): GamePlayer
    {
        $player = $game->players()->where('user_id', $user->id)->first();

        abort_unless($player !== null, 403);

        if ($game->status->inRound()) {
            throw new GameRuleException('game', __('Readiness can only change between rounds.'));
        }

        $player->update(['status' => $player->status->toggled()]);

        BestEffortBroadcast::dispatch(new GameUpdated($game));

        return $player;
    }
}
