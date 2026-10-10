<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\PlayerStatus;
use App\Events\PlayerJoined;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use App\Support\GameNews;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class JoinGame
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): Game
    {
        try {
            $player = DB::transaction(function () use ($game, $user): ?GamePlayer {
                // The lock serialises concurrent joins, so the capacity check
                // and the insert below see the same roster.
                $game = $game->freshLocked();

                if ($game->hasPlayer($user)) {
                    return null;
                }

                if ($game->status !== GameStatus::Recruiting) {
                    throw new GameRuleException('code', __('This operation is no longer recruiting.'));
                }

                if ($game->players()->count() >= $game->max_players) {
                    throw new GameRuleException('code', __('This operation roster is already full.'));
                }

                return GamePlayer::create([
                    'game_id' => $game->id,
                    'user_id' => $user->id,
                    'is_host' => false,
                    'status' => PlayerStatus::Ready,
                    'joined_at' => now(),
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            // A double-submitted join lost the race to its twin: the user is
            // in the game either way.
            $player = null;
        }

        if ($player) {
            BestEffortBroadcast::dispatch(new PlayerJoined($player));
            GameNews::playerJoined($game);
        }

        return $game->refresh();
    }
}
