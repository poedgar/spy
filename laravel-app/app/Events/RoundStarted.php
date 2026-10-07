<?php

namespace App\Events;

use App\Models\GameRound;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Not broadcast (GameUpdated covers open lobbies); it drives the push that
 * calls players back to the app when they are away from it.
 */
class RoundStarted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public GameRound $round,
    ) {}
}
