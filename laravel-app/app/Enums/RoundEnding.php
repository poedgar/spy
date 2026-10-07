<?php

namespace App\Enums;

/**
 * How a round ended. Abandoned rounds (the host reset the game mid-round)
 * have no winner and award no points.
 */
enum RoundEnding: string
{
    case Vote = 'vote';
    case SpyGuess = 'spy_guess';
    case Abandoned = 'abandoned';
}
