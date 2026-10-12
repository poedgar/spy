<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Models\FinishRound;
use App\Models\Game;

/**
 * Moves a round from writing to voting: the endings are shuffled so the
 * order gives nobody away. Runs inside the caller's transaction, on a game
 * the caller has locked.
 */
class OpenFinishVoting
{
    /** Voting needs a choice: at least two endings. */
    public const MIN_ANSWERS = 2;

    public function handle(Game $game, FinishRound $round): void
    {
        $round->update([
            'answer_order' => collect($round->authorIds())->shuffle()->values()->all(),
            'voting_started_at' => now(),
        ]);
        $game->update(['status' => GameStatus::Voting]);
    }
}
