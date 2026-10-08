<?php

namespace App\Notifications;

use App\Models\Game;

/**
 * A Spy round or Phrase deal the user is in has begun.
 */
class RoundStartedNotification extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    public function __construct(Game $game, int $number)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'number' => $number,
        ];
    }

    public function kind(): string
    {
        return 'round_started';
    }

    public function params(): array
    {
        return $this->params;
    }
}
