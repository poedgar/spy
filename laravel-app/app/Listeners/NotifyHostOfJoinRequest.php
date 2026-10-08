<?php

namespace App\Listeners;

use App\Events\JoinRequested;
use App\Notifications\JoinRequestReceived;

class NotifyHostOfJoinRequest
{
    public function handle(JoinRequested $event): void
    {
        $request = $event->joinRequest->loadMissing(['game.host', 'user']);

        $request->game->host->notify(new JoinRequestReceived($request->game, $request->user));
    }
}
