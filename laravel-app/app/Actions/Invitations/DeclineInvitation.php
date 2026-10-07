<?php

namespace App\Actions\Invitations;

use App\Enums\InvitationStatus;
use App\Models\Invitation;
use App\Models\User;

class DeclineInvitation
{
    public function handle(Invitation $invitation, User $user): void
    {
        abort_unless($invitation->to_user_id === $user->id, 403);

        if ($invitation->status === InvitationStatus::Pending) {
            $invitation->update(['status' => InvitationStatus::Declined]);
        }
    }
}
