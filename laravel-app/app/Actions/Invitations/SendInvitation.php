<?php

namespace App\Actions\Invitations;

use App\Enums\GameStatus;
use App\Enums\InvitationStatus;
use App\Events\InvitationIssued;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;

class SendInvitation
{
    /**
     * Every invitation pushes and emails the player, so the same person
     * can only be re-invited to a game once this many minutes have passed.
     */
    public const RESEND_COOLDOWN_MINUTES = 10;

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $toUserId): Invitation
    {
        abort_unless($game->host_id === $host->id, 403);
        abort_unless($game->status === GameStatus::Recruiting, 403);

        if ($toUserId === $host->id) {
            throw new GameRuleException('to_user_id', __('You cannot invite yourself.'));
        }

        if ($game->players()->where('user_id', $toUserId)->exists()) {
            throw new GameRuleException('to_user_id', __('That operative is already in this operation.'));
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('to_user_id', __('This operation roster is already full.'));
        }

        $existing = $game->invitations()->where('to_user_id', $toUserId)->first();

        if ($existing?->status === InvitationStatus::Pending
            && $existing->updated_at?->gt(now()->subMinutes(self::RESEND_COOLDOWN_MINUTES))) {
            throw new GameRuleException('to_user_id', __('You invited them a few minutes ago. Try again later.'));
        }

        $invitation = Invitation::updateOrCreate(
            ['game_id' => $game->id, 'to_user_id' => $toUserId],
            ['from_user_id' => $host->id, 'status' => InvitationStatus::Pending],
        );
        // A resend changes nothing but must restart the cooldown.
        $invitation->touch();

        InvitationIssued::dispatch($invitation);

        return $invitation;
    }
}
