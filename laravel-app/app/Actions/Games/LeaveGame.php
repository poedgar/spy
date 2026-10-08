<?php

namespace App\Actions\Games;

use App\Actions\Lobby\HandOverHost;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\BecameHost;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Leaves a game between rounds. A leaving host hands the game to the
 * longest-standing player; the last player out closes the game.
 */
class LeaveGame
{
    public function __construct(private HandOverHost $handOver) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): void
    {
        abort_unless($game->hasPlayer($user), 403);

        $newHostId = null;

        $closed = DB::transaction(function () use ($game, $user, &$newHostId): bool {
            $game = $game->freshLocked();

            // Roles and words are dealt per roster, so nobody may slip out mid-round.
            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('You cannot leave while a round is in progress.'));
            }

            if ($game->isHost($user)) {
                $newHostId = $this->handOver->toNextPlayer($game, $user->id);

                if ($newHostId === null) {
                    $game->delete();

                    return true;
                }
            }

            GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->delete();

            return false;
        });

        if ($closed) {
            return;
        }

        if ($newHostId !== null) {
            User::find($newHostId)?->notify(new BecameHost($game->refresh()));
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
