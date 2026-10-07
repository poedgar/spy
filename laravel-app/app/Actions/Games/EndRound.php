<?php

namespace App\Actions\Games;

use App\Enums\GameStatus;
use App\Enums\RoundEnding;
use App\Enums\Team;
use App\Events\GameUpdated;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRound;
use App\Support\BestEffortBroadcast;

/**
 * Shared by every way a round can finish. Runs inside the caller's
 * transaction (with the game row locked); the caller broadcasts afterwards.
 */
class EndRound
{
    /**
     * @param  array{winning_team?: Team|null, accused_user_id?: int|null, guessed_by_user_id?: int, guessed_location_id?: int}  $outcome
     */
    public function handle(Game $game, GameRound $round, RoundEnding $ending, array $outcome = []): void
    {
        $round->update([...$outcome, 'ending' => $ending, 'ended_at' => now()]);

        $winners = match ($round->winning_team) {
            Team::Spies => $round->spy_user_ids,
            Team::Loyalists => GamePlayer::where('game_id', $game->id)->whereNotIn('user_id', $round->spy_user_ids)->pluck('user_id')->all(),
            null => [],
        };

        if ($winners !== []) {
            GamePlayer::where('game_id', $game->id)->whereIn('user_id', $winners)->increment('score');
        }

        $game->update([
            'status' => $ending === RoundEnding::Abandoned ? GameStatus::Recruiting : GameStatus::Completed,
        ]);
    }

    public function broadcast(Game $game): void
    {
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
