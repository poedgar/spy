<?php

namespace App\Actions\Lobby;

use App\Actions\Games\JoinGame;
use App\Enums\InvitationStatus;
use App\Enums\JoinOutcome;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;

/**
 * What entering an invite code does: a seat straight away, or, when the
 * host approves new players, a request for one. Invited players always
 * walk straight in.
 */
class JoinByCode
{
    public function __construct(
        private JoinGame $joinGame,
        private RequestToJoin $requestToJoin,
    ) {}

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

        $this->requestToJoin->handle($game, $user, 'code');

        return JoinOutcome::Requested;
    }
}
