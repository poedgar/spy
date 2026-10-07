<?php

namespace App\Enums;

/**
 * A game loops recruiting → active → voting → completed, and the host can
 * start another round from completed or send everyone back to recruiting.
 */
enum GameStatus: string
{
    case Recruiting = 'recruiting';
    case Active = 'active';
    case Voting = 'voting';
    case Completed = 'completed';

    /**
     * Whether a round is underway, i.e. roles are assigned and secret.
     */
    public function inRound(): bool
    {
        return $this === self::Active || $this === self::Voting;
    }
}
