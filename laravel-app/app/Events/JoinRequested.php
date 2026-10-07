<?php

namespace App\Events;

use App\Models\JoinRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Someone asked for a seat. Not broadcast (GameUpdated refreshes the host's
 * lobby); it drives the push to the host.
 */
class JoinRequested
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public JoinRequest $joinRequest,
    ) {}
}
