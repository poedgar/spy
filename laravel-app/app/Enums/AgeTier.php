<?php

namespace App\Enums;

enum AgeTier: string
{
    case Children = 'children';
    case Teens = 'teens';
    case Adults = 'adults';

    /**
     * Tiers are cumulative: a teens game draws from the children and teens
     * pools, an adults game from every pool.
     *
     * @return list<self>
     */
    public function includedTiers(): array
    {
        return match ($this) {
            self::Children => [self::Children],
            self::Teens => [self::Children, self::Teens],
            self::Adults => [self::Children, self::Teens, self::Adults],
        };
    }
}
