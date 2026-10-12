<?php

namespace App\Notifications;

use App\Models\Game;
use App\Notifications\Channels\ExpoPushChannel;

/**
 * Sing It Out: it's this player's turn to sing. Only useful right now, so
 * a phone push only, like YourTurnToAsk.
 */
class YourTurnToSing extends GameNotification
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
        return 'your_turn_sing';
    }

    public function params(): array
    {
        return $this->params;
    }

    public function via(object $notifiable): array
    {
        return [ExpoPushChannel::class];
    }
}
