<?php

namespace App\Actions\Invitations;

use App\Events\InvitationIssued;
use App\Events\InvitationSent;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class SendInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $toUserId): Invitation
    {
        abort_unless($game->host_id === $host->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        if ($toUserId === $host->id) {
            throw new GameRuleException('to_user_id', 'You cannot invite yourself.');
        }

        if ($game->players()->where('user_id', $toUserId)->exists()) {
            throw new GameRuleException('to_user_id', 'That operative is already in this operation.');
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('to_user_id', 'This operation roster is already full.');
        }

        $invitation = Invitation::updateOrCreate(
            ['game_id' => $game->id, 'to_user_id' => $toUserId],
            ['from_user_id' => $host->id, 'status' => 'pending'],
        );

        InvitationIssued::dispatch($invitation);
        BestEffortBroadcast::dispatch(new InvitationSent($invitation));

        return $invitation;
    }
}
