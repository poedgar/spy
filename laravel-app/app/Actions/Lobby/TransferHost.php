<?php

namespace App\Actions\Lobby;

use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class TransferHost
{
    public function __construct(private HandOverHost $handOver) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $userId): void
    {
        abort_unless($game->isHost($host), 403);

        DB::transaction(function () use ($game, $userId) {
            $game = $game->freshLocked();

            if (! $game->hasPlayer($userId)) {
                throw new GameRuleException('game', __('That player is not in this game.'));
            }

            $this->handOver->to($game, $userId);
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
