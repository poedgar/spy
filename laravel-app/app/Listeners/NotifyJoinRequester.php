<?php

namespace App\Listeners;

use App\Events\JoinRequestDecided;
use App\Notifications\JoinRequestAnsweredNotification;

class NotifyJoinRequester
{
    public function handle(JoinRequestDecided $event): void
    {
        $request = $event->joinRequest->loadMissing(['game', 'user']);

        $request->user->notify(new JoinRequestAnsweredNotification($request->game, $event->approved));
    }
}
