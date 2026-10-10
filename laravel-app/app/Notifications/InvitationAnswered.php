<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\User;

/**
 * Tells whoever sent an invitation that it was accepted or declined.
 */
class InvitationAnswered extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Invitation $invitation, private bool $accepted)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $invitation->game->code,
            'game_title' => $invitation->game->title,
            'game_type' => $invitation->game->game_type->value,
            'from_codename' => $invitation->toUser->codename,
            'accepted' => $accepted,
        ];
    }

    public function kind(): string
    {
        return 'invitation_answered';
    }

    public function params(): array
    {
        return $this->params;
    }

    /**
     * A new player is worth a phone alert; a decline waits in the bell.
     */
    public function toExpoPush(User $notifiable): ?array
    {
        return $this->accepted ? parent::toExpoPush($notifiable) : null;
    }
}
