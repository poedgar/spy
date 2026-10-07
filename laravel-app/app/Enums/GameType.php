<?php

namespace App\Enums;

enum GameType: string
{
    case Spy = 'spy';
    case Phrase = 'phrase';

    /**
     * Phrase games are capped by the longest phrases in the pools: every
     * player needs a word of their own.
     */
    public function maxPlayers(): int
    {
        return match ($this) {
            self::Spy => 12,
            self::Phrase => 10,
        };
    }
}
