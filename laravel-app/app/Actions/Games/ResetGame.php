<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\RoundEnding;
use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Sends the game back to recruiting so new operatives can join. A round in
 * progress is abandoned without points; scores already earned are kept.
 */
class ResetGame
{
    public function __construct(private EndRound $endRound) {}

    public function handle(Game $game, User $host): void
    {
        abort_unless($game->isHost($host), 403);

        DB::transaction(function () use ($game) {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                $this->endRound->handle($game, $game->currentRound()->firstOrFail(), RoundEnding::Abandoned);
            } else {
                $game->update(['status' => GameStatus::Recruiting]);
            }
        });

        $this->endRound->broadcast($game);
    }
}
