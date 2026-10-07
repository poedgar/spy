<?php

namespace App\Actions\Lobby;

use App\Events\GameUpdated;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class UpdateGameSettings
{
    /**
     * @param  array{requires_approval?: bool}  $settings
     */
    public function handle(Game $game, User $host, array $settings): void
    {
        abort_unless($game->isHost($host), 403);

        $game->update($settings);

        BestEffortBroadcast::dispatch(new GameUpdated($game));
    }
}
