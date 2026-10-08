<?php

namespace App\Listeners;

use App\Events\RoundStarted;
use App\Models\User;
use App\Notifications\RoundStartedNotification;
use Illuminate\Support\Facades\Notification;

class NotifyRoundStarted
{
    /**
     * Everyone but the host, who started the round and is looking at it.
     */
    public function handle(RoundStarted $event): void
    {
        $game = $event->game;
        $players = User::whereIn('id', $game->players()->where('user_id', '!=', $game->host_id)->select('user_id'))->get();

        Notification::send($players, new RoundStartedNotification($game, $event->number));
    }
}
