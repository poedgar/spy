<?php

namespace App\Notifications;

use App\Models\Game;
use App\Models\User;

/**
 * Someone asked the host for a seat in their game.
 */
class JoinRequestReceived extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game, User $requester)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'from_codename' => $requester->codename,
        ];
    }

    public function kind(): string
    {
        return 'join_request';
    }

    public function params(): array
    {
        return $this->params;
    }
}
