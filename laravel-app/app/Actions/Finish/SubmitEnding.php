<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\FinishRound;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * A player writes (or rewrites) their ending. Once everyone has one, the
 * vote opens by itself.
 */
class SubmitEnding
{
    public function __construct(private OpenFinishVoting $openVoting) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $author, string $ending): void
    {
        abort_unless($game->hasPlayer($author), 403);
        $game->ensureType(GameType::Finish);

        $ending = trim(preg_replace('/\s+/u', ' ', $ending) ?? '');

        if ($ending === '') {
            throw new GameRuleException('ending', __('Write an ending first.'));
        }

        DB::transaction(function () use ($game, $author, $ending): void {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('ending', __('Endings can only be written before the vote.'));
            }

            $round = $game->currentFinishRound()->firstOrFail();
            $answers = $round->answers ?? [];
            $answers[$author->id] = mb_substr($ending, 0, FinishRound::MAX_ANSWER_LENGTH);
            $round->update(['answers' => $answers]);

            $players = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            if ($players->every(fn (int $id) => array_key_exists($id, $answers))) {
                $this->openVoting->handle($game, $round);
            }
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
