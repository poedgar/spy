<?php

namespace App\Events;

use App\Models\JoinRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * The host answered a join request; NotifyJoinRequester tells the player.
 */
class JoinRequestDecided
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public JoinRequest $joinRequest,
        public bool $approved,
    ) {}
}
