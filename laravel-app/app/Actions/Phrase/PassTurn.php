<?php

namespace App\Actions\Phrase;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Notifications\YourTurnToAsk;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Questions are asked out loud; the app only keeps track of whose turn it
 * is. The current asker (or the host, if they forget) passes it on.
 */
class PassTurn
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): void
    {
        abort_unless($game->hasPlayer($user), 403);
        $game->ensureType(GameType::Phrase);

        $nextAskerId = DB::transaction(function () use ($game, $user): ?int {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('game', __('There is no round in progress.'));
            }

            $round = $game->currentPhraseRound()->firstOrFail();

            if (! $game->isHost($user) && $round->askerId() !== $user->id) {
                throw new GameRuleException('game', __('Only the current asker or the host can pass the turn.'));
            }

            $round->increment('turn_index');

            return $round->askerId();
        });

        if ($nextAskerId !== null && $nextAskerId !== $user->id) {
            User::find($nextAskerId)?->notify(new YourTurnToAsk($game));
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
