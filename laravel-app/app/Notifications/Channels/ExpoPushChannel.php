<?php

namespace App\Notifications\Channels;

use App\Models\User;
use App\Notifications\GameNotification;
use App\Support\ExpoPush;
use Illuminate\Notifications\Notification;
use Throwable;

/**
 * Sends a notification to every phone the user is signed in on. Best
 * effort: an Expo outage is logged, never failing the request that sent it
 * (with QUEUE_CONNECTION=sync that request is the player's own).
 */
class ExpoPushChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User || ! $notification instanceof GameNotification) {
            return;
        }

        $message = $notification->toExpoPush($notifiable);

        if ($message === null) {
            return;
        }

        try {
            ExpoPush::send($notifiable->pushTokens()->get(), fn () => $message);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
