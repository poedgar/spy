<?php

namespace App\Actions\Emotion;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Events\RoundStarted;
use App\Exceptions\GameRuleException;
use App\Models\EmotionRound;
use App\Models\Face;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use App\Support\EmotionCatalog;
use Illuminate\Support\Facades\DB;

/**
 * Shows the whole table one face at the game's level, with that level's
 * number of options. Scores carry over.
 */
class StartEmotionRound
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): EmotionRound
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureType(GameType::Emotion);

        $round = DB::transaction(function () use ($game): EmotionRound {
            $game = $game->freshLocked();

            if ($game->status->inRound()) {
                throw new GameRuleException('game', __('A round is already in progress.'));
            }

            if ($game->players()->count() < $game->game_type->minPlayers()) {
                throw new GameRuleException('game', __('At least :count operatives are required to start.', ['count' => $game->game_type->minPlayers()]));
            }

            $face = $this->pickFace($game, $game->emotion_level ?? EmotionCatalog::LEVEL_EASY);

            if ($face === null) {
                throw new GameRuleException('game', __('There are no faces yet. An admin needs to add some.'));
            }

            $round = $game->emotionRounds()->create([
                'number' => ((int) $game->emotionRounds()->max('number')) + 1,
                'face_id' => $face->id,
                'level' => $game->emotion_level ?? EmotionCatalog::LEVEL_EASY,
                'options' => EmotionCatalog::optionsFor($face->emotion, $game->emotion_level ?? EmotionCatalog::LEVEL_EASY),
                'answers' => [],
                'started_at' => now(),
            ]);

            $game->update(['status' => GameStatus::Active]);

            return $round;
        });

        RoundStarted::dispatch($game, $round->number);
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));

        return $round;
    }

    /**
     * Every emotion equally likely (some have many more faces than others),
     * then a face of it this game hasn't shown. Falls back to faces already
     * shown, then to any face in play.
     */
    private function pickFace(Game $game, int $level): ?Face
    {
        $seen = $game->emotionRounds()->pluck('face_id');

        foreach ([Face::atLevel($level)->whereNotIn('id', $seen), Face::atLevel($level), Face::where('active', true)] as $pool) {
            $emotion = (clone $pool)->distinct()->pluck('emotion')->shuffle()->first();

            if ($emotion !== null) {
                return (clone $pool)->where('emotion', $emotion)->inRandomOrder()->first();
            }
        }

        return null;
    }
}
