<?php

namespace App\Actions\Lobby;

use App\Actions\Games\JoinGame;
use App\Enums\GameStatus;
use App\Enums\InvitationStatus;
use App\Enums\JoinOutcome;
use App\Events\GameUpdated;
use App\Events\JoinRequested;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\JoinRequest;
use App\Models\User;
use App\Support\BestEffortBroadcast;

/**
 * What entering an invite code does: a seat straight away, or, when the
 * host approves new players, a request for one. Invited players always
 * walk straight in.
 */
class JoinByCode
{
    public function __construct(private JoinGame $joinGame) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): JoinOutcome
    {
        $invited = $game->invitations()
            ->where('to_user_id', $user->id)
            ->where('status', InvitationStatus::Pending)
            ->exists();

        if ($game->hasPlayer($user) || ! $game->requires_approval || $invited) {
            $this->joinGame->handle($game, $user);

            return JoinOutcome::Joined;
        }

        if ($game->status !== GameStatus::Recruiting) {
            throw new GameRuleException('code', __('This operation is no longer recruiting.'));
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('code', __('This operation roster is already full.'));
        }

        $request = JoinRequest::updateOrCreate(
            ['game_id' => $game->id, 'user_id' => $user->id],
            ['status' => InvitationStatus::Pending],
        );

        if ($request->wasRecentlyCreated || $request->wasChanged('status')) {
            JoinRequested::dispatch($request);
            BestEffortBroadcast::dispatch(new GameUpdated($game));
        }

        return JoinOutcome::Requested;
    }
}
