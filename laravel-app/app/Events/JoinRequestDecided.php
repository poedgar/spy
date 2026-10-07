<?php

namespace App\Events;

use App\Models\JoinRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * The host answered a join request. Deliberately not broadcast, like
 * InvitationIssued: broadcast() skips listeners, so the push listener hangs
 * off this event while JoinRequestAnswered carries the live update.
 */
class JoinRequestDecided
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public JoinRequest $joinRequest,
        public bool $approved,
    ) {}
}
