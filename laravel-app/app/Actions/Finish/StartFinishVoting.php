<?php

namespace App\Actions\Finish;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * The host opens the vote without waiting for everyone's ending.
 */
class StartFinishVoting
{
    public function __construct(private OpenFinishVoting $openVoting) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): void
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureType(GameType::Finish);

        DB::transaction(function () use ($game): void {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('game', __('There is no round in progress.'));
            }

            $round = $game->currentFinishRound()->firstOrFail();

            if (count($round->authorIds()) < OpenFinishVoting::MIN_ANSWERS) {
                throw new GameRuleException('game', __('Voting needs at least :count endings.', ['count' => OpenFinishVoting::MIN_ANSWERS]));
            }

            $this->openVoting->handle($game, $round);
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
