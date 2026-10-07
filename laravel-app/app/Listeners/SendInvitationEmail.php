<?php

namespace App\Listeners;

use App\Events\InvitationIssued;
use App\Notifications\InvitationReceived;

class SendInvitationEmail
{
    public function handle(InvitationIssued $event): void
    {
        $invitee = $event->invitation->toUser;

        if ($invitee->email_notifications) {
            $invitee->notify(new InvitationReceived($event->invitation));
        }
    }
}
