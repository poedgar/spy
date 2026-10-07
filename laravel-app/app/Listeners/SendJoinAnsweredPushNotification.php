<?php

namespace App\Listeners;

use App\Events\JoinRequestDecided;
use App\Support\ExpoPush;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Only approvals are pushed: being turned away needs no alert, and the
 * requester sees it next time they open the app.
 */
class SendJoinAnsweredPushNotification implements ShouldQueue
{
    public function handle(JoinRequestDecided $event): void
    {
        if (! $event->approved) {
            return;
        }

        $request = $event->joinRequest->loadMissing(['game', 'user.pushTokens']);
        $locale = $request->user->preferredLocale();

        ExpoPush::send($request->user->pushTokens, fn () => [
            'title' => __('You are in!', [], $locale),
            'body' => __('The host let you into :title.', ['title' => $request->game->title], $locale),
            'sound' => 'default',
            'channelId' => 'game',
            'data' => [
                'type' => 'round',
                'code' => $request->game->code,
            ],
        ]);
    }
}
