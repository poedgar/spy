<?php

namespace App\Notifications\Channels;

use Illuminate\Mail\SentMessage;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Notifications\Notification;
use Throwable;

/**
 * Laravel's mail channel, made best-effort like LiveChannel: the
 * notification is already stored and pushed, so a mail outage is logged
 * instead of failing the request that sent it (with QUEUE_CONNECTION=sync
 * that request is the player's own).
 */
class BestEffortMailChannel extends MailChannel
{
    public function send($notifiable, Notification $notification): ?SentMessage
    {
        try {
            return parent::send($notifiable, $notification);
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }
}
