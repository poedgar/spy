<?php

namespace App\Actions\Emotion;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * A player picks the emotion they see; they can change it until the answer
 * is revealed, which happens once everyone has picked.
 */
class AnswerEmotion
{
    public function __construct(private RevealEmotion $reveal) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $player, string $emotion): void
    {
        abort_unless($game->hasPlayer($player), 403);
        $game->ensureType(GameType::Emotion);

        $everyoneAnswered = DB::transaction(function () use ($game, $player, $emotion): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('emotion', __('There is no face to name right now.'));
            }

            $round = $game->currentEmotionRound()->firstOrFail();

            if (! in_array($emotion, $round->options, true)) {
                throw new GameRuleException('emotion', __('Pick one of the options.'));
            }

            $answers = $round->answers ?? [];
            $answers[$player->id] = $emotion;
            $round->update(['answers' => $answers]);

            $players = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            return $players->every(fn (int $id) => array_key_exists($id, $answers));
        });

        if ($everyoneAnswered) {
            $this->reveal->handle($game, $player, byHost: false);

            return;
        }

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
