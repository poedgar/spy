<?php

namespace App\Actions\Games;

use App\Actions\Phrase\RevealPhrase;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Models\Game;

/**
 * Applies an expired round timer: a Spy round moves to the vote, a Phrase
 * deal is revealed. Run whenever a lobby is loaded, so timers need no
 * queue worker; clients reload when their countdown reaches zero.
 */
class EnforceRoundTimer
{
    public function __construct(
        private StartVoting $startVoting,
        private RevealPhrase $revealPhrase,
    ) {}

    public function handle(Game $game): void
    {
        if ($game->status !== GameStatus::Active || $game->round_seconds === null) {
            return;
        }

        $round = $game->game_type === GameType::Phrase
            ? $game->currentPhraseRound()->first()
            : $game->currentRound()->first();

        if ($round?->ends_at === null || $round->ends_at->isFuture()) {
            return;
        }

        $game->game_type === GameType::Phrase
            ? $this->revealPhrase->handle($game)
            : $this->startVoting->handle($game);
    }
}
