<?php

namespace App\Notifications;

use App\Models\Game;
use App\Notifications\Channels\ExpoPushChannel;

/**
 * Phrase: it's this player's turn to ask a question. Frequent and only
 * useful right now, so it is a phone push only: not kept in the bell, and
 * not shown live (the open lobby already says whose turn it is).
 */
class YourTurnToAsk extends GameNotification
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
        return 'your_turn';
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
