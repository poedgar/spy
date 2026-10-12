<?php

namespace App\Enums;

enum GameType: string
{
    case Spy = 'spy';
    case Phrase = 'phrase';
    case Song = 'song';
    case Finish = 'finish';

    /**
     * The fewest players a round can start with, and the size a new game's
     * table defaults to.
     */
    public function minPlayers(): int
    {
        return match ($this) {
            self::Spy, self::Phrase, self::Song, self::Finish => 3,
        };
    }

    /**
     * Phrase games are capped by the longest phrases in the pools: every
     * player needs a word of their own.
     */
    public function maxPlayers(): int
    {
        return match ($this) {
            self::Spy => 12,
            self::Phrase, self::Song, self::Finish => 10,
        };
    }
}
