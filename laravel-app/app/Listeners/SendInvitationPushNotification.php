<?php

namespace App\Listeners;

use App\Events\InvitationIssued;
use App\Support\ExpoPush;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendInvitationPushNotification implements ShouldQueue
{
    public function handle(InvitationIssued $event): void
    {
        $invitation = $event->invitation->loadMissing(['game', 'fromUser', 'toUser.pushTokens']);
        $locale = $invitation->toUser->preferredLocale();

        ExpoPush::send($invitation->toUser->pushTokens, fn () => [
            'title' => __('New operation invite', [], $locale),
            'body' => __(':codename invited you to :title', [
                'codename' => $invitation->fromUser->codename,
                'title' => $invitation->game->title,
            ], $locale),
            'sound' => 'default',
            'channelId' => 'invitations',
            'data' => [
                'type' => 'invitation',
                'invitation_id' => $invitation->id,
                'code' => $invitation->game->code,
            ],
        ]);
    }
}
