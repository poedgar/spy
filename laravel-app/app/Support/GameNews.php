<?php

namespace App\Support;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\GameNotification;
use App\Notifications\ReadyToStart;
use Illuminate\Support\Facades\Notification;

/**
 * Who hears about what happens in a game, shared by the game actions.
 */
class GameNews
{
    /**
     * Tells everyone in the game, except whoever caused it.
     */
    public static function toPlayers(Game $game, GameNotification $notification, ?int $exceptUserId = null): void
    {
        $users = User::whereIn('id', GamePlayer::where('game_id', $game->id)
            ->when($exceptUserId, fn ($query) => $query->where('user_id', '!=', $exceptUserId))
            ->select('user_id'))
            ->get();

        Notification::send($users, $notification);
    }

    /**
     * After a join: tell the host once the table reaches the minimum. Only
     * on reaching it exactly, so later joins don't repeat the news.
     */
    public static function playerJoined(Game $game): void
    {
        $game->refresh();
        $count = $game->players()->count();

        if ($game->status === GameStatus::Recruiting && $count === $game->game_type->minPlayers()) {
            $game->host?->notify(new ReadyToStart($game, $count));
        }
    }
}
