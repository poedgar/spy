<?php

namespace App\Enums;

/**
 * Flavor only: every mode plays by the same rules.
 */
enum GameMode: string
{
    case Mole = 'mole';
    case Codebreaker = 'codebreaker';
    case Counterintel = 'counterintel';
}
