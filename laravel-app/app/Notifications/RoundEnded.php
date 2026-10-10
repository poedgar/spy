<?php

namespace App\Notifications;

use App\Models\Game;

/**
 * A round finished: who won, for players who weren't looking.
 */
class RoundEnded extends GameNotification
{
    /** @var array<string, mixed> */
    private array $params;

    /**
     * @param  array{number: int, winning_team?: string|null, phrase_ending?: string|null, winner_codename?: string|null}  $outcome
     */
    public function __construct(Game $game, array $outcome)
    {
        parent::__construct();

        $this->params = [
            'game_code' => $game->code,
            'game_title' => $game->title,
            'game_type' => $game->game_type->value,
            'number' => $outcome['number'],
            'winning_team' => $outcome['winning_team'] ?? null,
            'phrase_ending' => $outcome['phrase_ending'] ?? null,
            'winner_codename' => $outcome['winner_codename'] ?? null,
        ];
    }

    public function kind(): string
    {
        return 'round_ended';
    }

    public function params(): array
    {
        return $this->params;
    }
}
