<?php

namespace App\Listeners;

use App\Events\RoundStarted;
use App\Models\PushToken;
use App\Support\ExpoPush;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendRoundStartedPushNotification implements ShouldQueue
{
    public function handle(RoundStarted $event): void
    {
        $game = $event->game;

        // The host started the round, so they are already looking at it.
        $tokens = PushToken::query()
            ->with('user')
            ->whereIn('user_id', $game->players()->where('user_id', '!=', $game->host_id)->select('user_id'))
            ->get();

        ExpoPush::send($tokens, function (PushToken $token) use ($event, $game) {
            $locale = $token->user->preferredLocale();

            return [
                'title' => __('Round :number has begun', ['number' => $event->number], $locale),
                'body' => __('Open :title to see your role.', ['title' => $game->title], $locale),
                'sound' => 'default',
                'channelId' => 'game',
                'data' => [
                    'type' => 'round',
                    'code' => $game->code,
                ],
            ];
        });
    }
}
