<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Channels\BroadcastChannel;
use Illuminate\Notifications\Notification;
use Throwable;

/**
 * Laravel's broadcast channel, made best-effort like BestEffortBroadcast:
 * the notification is already stored, so a broadcaster outage only costs
 * the live delivery (clients fall back to polling) instead of failing the
 * request or job that sent it.
 */
class LiveChannel extends BroadcastChannel
{
    /**
     * @return array<mixed>|null
     */
    public function send($notifiable, Notification $notification): ?array
    {
        try {
            return parent::send($notifiable, $notification);
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }
}
