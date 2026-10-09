<?php

namespace App\Enums;

enum PhraseEnding: string
{
    case Guessed = 'guessed';
    /** The host gave up and showed the phrase. */
    case Revealed = 'revealed';
    /** The round timer ran out. */
    case TimeUp = 'time_up';
    case Abandoned = 'abandoned';
}
