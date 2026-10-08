<?php

namespace App\Listeners;

use App\Events\InvitationIssued;
use App\Notifications\InvitationReceived;

class NotifyInvitee
{
    public function handle(InvitationIssued $event): void
    {
        $event->invitation->toUser->notify(new InvitationReceived($event->invitation));
    }
}
