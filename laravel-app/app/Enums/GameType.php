<?php

namespace App\Enums;

enum GameType: string
{
    case Spy = 'spy';
    case Phrase = 'phrase';
    case Song = 'song';
    case Finish = 'finish';
    case Meaning = 'meaning';
    case Emotion = 'emotion';
    case Meme = 'meme';

    /**
     * The fewest players a round can start with, and the size a new game's
     * table defaults to.
     */
    public function minPlayers(): int
    {
        return match ($this) {
            self::Spy, self::Phrase, self::Song, self::Finish, self::Meaning, self::Emotion, self::Meme => 3,
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
            self::Phrase, self::Song, self::Finish, self::Meaning, self::Emotion, self::Meme => 10,
        };
    }

    /**
     * Games where everyone writes an answer to the same prompt (a phrase, or
     * a picture to caption in Meme It) and votes on
     * the answers without names. They share one engine and rounds table.
     */
    public function isWritten(): bool
    {
        return $this === self::Finish || $this === self::Meaning || $this === self::Meme;
    }
}
