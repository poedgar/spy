<?php

namespace App\Actions\Lobby;

use App\Events\GameUpdated;
use App\Models\Game;
use App\Models\User;
use App\Notifications\GameClosed;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\Notification;

/**
 * The host ends a game for good: everyone else is told, then it is deleted
 * along with its rounds, invitations and requests.
 */
class CloseGame
{
    public function handle(Game $game, User $host): void
    {
        abort_unless($game->isHost($host), 403);

        $others = User::whereIn('id', $game->players()->where('user_id', '!=', $host->id)->select('user_id'))->get();
        $notification = new GameClosed($game);

        // Open lobbies refetch on this and find the game gone.
        BestEffortBroadcast::dispatch(new GameUpdated($game));
        $game->delete();

        Notification::send($others, $notification);
    }
}
