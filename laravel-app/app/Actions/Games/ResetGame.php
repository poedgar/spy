<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PhraseEnding;
use App\Enums\RoundEnding;
use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Sends the game back to recruiting so new players can join. A round in
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

            if ($game->game_type === GameType::Spy && $game->status->inRound()) {
                $this->endRound->handle($game, $game->currentRound()->firstOrFail(), RoundEnding::Abandoned);

                return;
            }

            if ($game->game_type === GameType::Phrase && $game->status === GameStatus::Active) {
                $game->currentPhraseRound()->firstOrFail()->update([
                    'ended_at' => now(),
                    'ending' => PhraseEnding::Abandoned,
                ]);
            }

            $game->update(['status' => GameStatus::Recruiting]);
        });

        $this->endRound->broadcast($game);
    }
}
