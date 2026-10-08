<?php

namespace App\Actions\Lobby;

use App\Enums\GameStatus;
use App\Enums\InvitationStatus;
use App\Events\GameUpdated;
use App\Events\JoinRequested;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\JoinRequest;
use App\Models\User;
use App\Support\BestEffortBroadcast;

/**
 * Asks the host for a seat: from the open games list, or by code in a game
 * that approves new players. Asking again after a decline is allowed.
 */
class RequestToJoin
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user, string $field = 'game'): JoinRequest
    {
        if ($game->hasPlayer($user)) {
            throw new GameRuleException($field, __('You are already in this game.'));
        }

        if ($game->status !== GameStatus::Recruiting) {
            throw new GameRuleException($field, __('This operation is no longer recruiting.'));
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException($field, __('This operation roster is already full.'));
        }

        $request = JoinRequest::updateOrCreate(
            ['game_id' => $game->id, 'user_id' => $user->id],
            ['status' => InvitationStatus::Pending],
        );

        if ($request->wasRecentlyCreated || $request->wasChanged('status')) {
            JoinRequested::dispatch($request);
            BestEffortBroadcast::dispatch(new GameUpdated($game));
        }

        return $request;
    }

    /**
     * Withdraws the user's pending request, if they have one.
     */
    public function cancel(Game $game, User $user): void
    {
        $deleted = $game->joinRequests()
            ->where('user_id', $user->id)
            ->where('status', InvitationStatus::Pending)
            ->delete();

        if ($deleted > 0) {
            BestEffortBroadcast::dispatch(new GameUpdated($game));
        }
    }
}
