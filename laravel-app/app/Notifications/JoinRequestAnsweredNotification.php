<?php

namespace App\Notifications;

use App\Models\Game;
use App\Models\User;

/**
 * The host let the user in, or turned their request down.
 */
class JoinRequestAnsweredNotification extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game, private bool $approved)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'approved' => $approved,
        ];
    }

    public function kind(): string
    {
        return 'join_answered';
    }

    public function params(): array
    {
        return $this->params;
    }

    /**
     * Only being let in is worth a phone alert; a decline waits in the bell.
     */
    public function toExpoPush(User $notifiable): ?array
    {
        return $this->approved ? parent::toExpoPush($notifiable) : null;
    }
}
