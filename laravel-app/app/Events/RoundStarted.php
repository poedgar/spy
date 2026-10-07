<?php

namespace App\Events;

use App\Models\Game;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A Spy round or a Phrase deal began. Not broadcast (GameUpdated covers open
 * lobbies); it drives the push that calls players back to the app when they
 * are away from it.
 */
class RoundStarted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Game $game,
        public int $number,
    ) {}
}
