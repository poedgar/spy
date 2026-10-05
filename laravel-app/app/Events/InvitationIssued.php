<?php

namespace App\Events;

use App\Models\Invitation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired for every new or re-sent invitation. Deliberately not broadcast:
 * the dispatcher broadcasts before it calls listeners, so hanging the push
 * notification listener off the broadcast InvitationSent event would let a
 * Pusher failure silently drop the push.
 */
class InvitationIssued
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Invitation $invitation,
    ) {}
}
