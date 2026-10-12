<?php

namespace App\Actions\Song;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Events\RoundStarted;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\Song;
use App\Models\SongRound;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Deals a clip to the whole table (one this game hasn't heard yet, when
 * possible) and shuffles the singing order. Scores carry over.
 */
class StartSongRound
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): SongRound
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureType(GameType::Song);

        $round = DB::transaction(function () use ($game): SongRound {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('A round is already in progress.'));
            }

            $playerIds = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            if ($playerIds->count() < $game->game_type->minPlayers()) {
                throw new GameRuleException('game', __('At least :count operatives are required to start.', ['count' => $game->game_type->minPlayers()]));
            }

            $played = $game->songRounds()->pluck('song_id');
            $song = Song::whereNotIn('id', $played)->inRandomOrder()->first()
                ?? Song::inRandomOrder()->first();

            if ($song === null) {
                throw new GameRuleException('game', __('There are no songs yet. An admin needs to add some.'));
            }

            $round = $game->songRounds()->create([
                'number' => ((int) $game->songRounds()->max('number')) + 1,
                'song_id' => $song->id,
                'turn_order' => $playerIds->shuffle()->values()->all(),
                'turn_index' => 0,
                'votes' => [],
                'started_at' => now(),
            ]);

            $game->update(['status' => GameStatus::Active]);

            return $round;
        });

        RoundStarted::dispatch($game, $round->number);
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));

        return $round;
    }
}
