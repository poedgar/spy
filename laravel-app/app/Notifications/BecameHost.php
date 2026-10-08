<?php

namespace App\Notifications;

use App\Models\Game;

/**
 * Hosting passed to the user (handed over, or the host left).
 */
class BecameHost extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
        ];
    }

    public function kind(): string
    {
        return 'became_host';
    }

    public function params(): array
    {
        return $this->params;
    }
}
