<?php

namespace App\Notifications;

use App\Models\Game;

/**
 * Tells the host that enough players have joined to start.
 */
class ReadyToStart extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game, int $playerCount)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'count' => $playerCount,
        ];
    }

    public function kind(): string
    {
        return 'ready_to_start';
    }

    public function params(): array
    {
        return $this->params;
    }
}
