<?php

namespace App\Actions\Invitations;

use App\Enums\InvitationStatus;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\User;

class CancelInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $invitationId): void
    {
        abort_unless($game->isHost($host), 403);

        $invitation = $game->invitations()->findOrFail($invitationId);

        if ($invitation->status === InvitationStatus::Accepted) {
            throw new GameRuleException('to_user_id', __('That invitation was already accepted.'));
        }

        $invitation->delete();
    }
}
