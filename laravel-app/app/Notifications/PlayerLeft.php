<?php

namespace App\Notifications;

use App\Models\Game;
use App\Models\User;

/**
 * Tells the host that a player left, so a seat is free again.
 */
class PlayerLeft extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game, User $leaver)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'from_codename' => $leaver->codename,
        ];
    }

    public function kind(): string
    {
        return 'player_left';
    }

    public function params(): array
    {
        return $this->params;
    }

    /**
     * Worth seeing in the lobby, not worth buzzing a phone for.
     */
    public function toExpoPush(User $notifiable): ?array
    {
        return null;
    }
}
