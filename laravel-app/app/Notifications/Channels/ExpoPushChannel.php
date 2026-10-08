<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Notifications\GameNotification;
use App\Support\ExpoPush;
use Illuminate\Notifications\Notification;

/**
 * Sends a notification to every phone the user is signed in on.
 */
class ExpoPushChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User || ! $notification instanceof GameNotification) {
            return;
        }

        $message = $notification->toExpoPush($notifiable);

        if ($message !== null) {
            ExpoPush::send($notifiable->pushTokens()->get(), fn () => $message);
        }
    }
}
