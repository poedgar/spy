<?php

namespace App\Actions\Lobby;

use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class UpdateGameSettings
{
    /**
     * @param  array{requires_approval?: bool, is_listed?: bool, title?: string}  $settings
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, array $settings): void
    {
        abort_unless($game->isHost($host), 403);

        // The name is part of the invitation; it stays once play begins.
        if (array_key_exists('title', $settings) && ! $game->canRename()) {
            throw new GameRuleException('title', __('The name can only be changed before the game starts.'));
        }

        $game->update($settings);

        BestEffortBroadcast::dispatch(new GameUpdated($game));
    }
}
