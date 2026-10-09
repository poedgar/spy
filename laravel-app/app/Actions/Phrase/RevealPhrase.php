<?php

namespace App\Actions\Phrase;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PhraseEnding;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Ends a deal nobody could crack and shows everyone the phrase, with no
 * points awarded: at the host's call, or when the round timer runs out.
 */
class RevealPhrase
{
    /**
     * @param  User|null  $host  null when the timer ends the deal
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, ?User $host = null): void
    {
        if ($host) {
            abort_unless($game->isHost($host), 403);
        }

        $game->ensureType(GameType::Phrase);

        $revealed = DB::transaction(function () use ($game, $host): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                return false;
            }

            $game->currentPhraseRound()->firstOrFail()->update([
                'ended_at' => now(),
                'ending' => $host ? PhraseEnding::Revealed : PhraseEnding::TimeUp,
            ]);
            $game->update(['status' => GameStatus::Completed]);

            return true;
        });

        if (! $revealed && $host) {
            throw new GameRuleException('game', __('There is no round in progress.'));
        }

        if ($revealed) {
            BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
        }
    }
}
