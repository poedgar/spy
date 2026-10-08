<?php

namespace App\Events;

use App\Models\Invitation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired for every new or re-sent invitation; NotifyInvitee tells the player
 * (in the app, live, by push and, if they allow it, by email).
 */
class InvitationIssued
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Invitation $invitation,
    ) {}
}
