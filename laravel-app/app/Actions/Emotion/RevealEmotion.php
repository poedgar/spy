<?php

namespace App\Actions\Emotion;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\EmotionRound;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Support\BestEffortBroadcast;
use App\Support\GameNews;
use Illuminate\Support\Facades\DB;

/**
 * Shows the right emotion: everyone who named it scores a point, and every
 * answer counts towards the face's measured hit rate.
 */
class RevealEmotion
{
    /** Points for naming the emotion. */
    public const WIN_POINTS = 1;

    /**
     * @param  bool  $byHost  the host revealing early (else the last answer did)
     *
     * @throws GameRuleException
     */
    public function handle(Game $game, User $actor, bool $byHost = true): void
    {
        $game->ensureType(GameType::Emotion);

        if ($byHost) {
            abort_unless($game->isHost($actor), 403);
        }

        $revealed = DB::transaction(function () use ($game, $actor): bool {
            $game = $game->freshLocked();

            // A host's reveal can cross the last answer: whoever loses finds it done.
            if ($game->status !== GameStatus::Active) {
                return false;
            }

            $round = $game->currentEmotionRound()->with('face')->firstOrFail();
            $right = $round->correctUserIds();

            if ($right !== []) {
                GamePlayer::where('game_id', $game->id)->whereIn('user_id', $right)->increment('score', self::WIN_POINTS);
            }

            $round->face->increment('shown_count', count($round->answers ?? []));
            $round->face->increment('correct_count', count($right));

            $round->update(['ended_at' => now(), 'ending' => EmotionRound::ENDING_REVEALED]);
            $game->update(['status' => GameStatus::Completed]);

            GameNews::toPlayers($game, new RoundEnded($game, [
                'number' => $round->number,
                'emotion_winners' => User::whereIn('id', $right)->pluck('codename')->implode(', ') ?: null,
            ]), $actor->id);

            return true;
        });

        if (! $revealed && $byHost) {
            throw new GameRuleException('game', __('There is no face to name right now.'));
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
