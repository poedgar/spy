<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Enums\Locale;
use App\Events\GameUpdated;
use App\Events\RoundStarted;
use App\Exceptions\GameRuleException;
use App\Models\FinishRound;
use App\Models\Game;
use App\Models\Prompt;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Deals one phrase to the whole table, from the game's own pool (Finish the
 * Phrase beginnings or Interpret the Phrase idioms) in its language, one
 * this game hasn't had yet when possible. Scores carry over.
 */
class StartFinishRound
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): FinishRound
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureWritten();

        $round = DB::transaction(function () use ($game): FinishRound {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('A round is already in progress.'));
            }

            if ($game->players()->count() < $game->game_type->minPlayers()) {
                throw new GameRuleException('game', __('At least :count operatives are required to start.', ['count' => $game->game_type->minPlayers()]));
            }

            $pool = Prompt::where('game_type', $game->game_type->value)
                ->where('language', ($game->phrase_language ?? Locale::English)->value);
            $used = $game->finishRounds()->pluck('prompt_id');
            $prompt = (clone $pool)->whereNotIn('id', $used)->inRandomOrder()->first()
                ?? (clone $pool)->inRandomOrder()->first();

            if ($prompt === null) {
                throw new GameRuleException('game', __('There are no phrases for this game in this language yet. An admin needs to add some.'));
            }

            $round = $game->finishRounds()->create([
                'number' => ((int) $game->finishRounds()->max('number')) + 1,
                'prompt_id' => $prompt->id,
                'text' => $prompt->text,
                'meaning' => $prompt->meaning,
                'answers' => [],
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
