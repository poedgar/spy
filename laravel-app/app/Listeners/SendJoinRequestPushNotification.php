<?php

namespace App\Listeners;

use App\Events\JoinRequested;
use App\Support\ExpoPush;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendJoinRequestPushNotification implements ShouldQueue
{
    public function handle(JoinRequested $event): void
    {
        $request = $event->joinRequest->loadMissing(['game.host.pushTokens', 'user']);
        $host = $request->game->host;
        $locale = $host->preferredLocale();

        ExpoPush::send($host->pushTokens, fn () => [
            'title' => __('Someone wants to join', [], $locale),
            'body' => __(':codename asked to join :title', [
                'codename' => $request->user->codename,
                'title' => $request->game->title,
            ], $locale),
            'sound' => 'default',
            'channelId' => 'game',
            'data' => [
                'type' => 'join_request',
                'code' => $request->game->code,
            ],
        ]);
    }
}
