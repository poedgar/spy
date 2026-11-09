<?php

namespace App\Http\Requests\Concerns;

use App\Enums\GameType;

/**
 * The host picks both how many players a round needs (min_players) and how
 * many the table holds (max_players), within the game type's limits.
 */
trait ValidatesPlayerLimits
{
    /**
     * @return array<string, array<int, string>>
     */
    protected function playerLimitRules(GameType $type): array
    {
        return [
            'max_players' => ['required', 'integer', 'min:'.$type->minPlayers(), 'max:'.$type->maxPlayers()],
            // Older clients send only the table size: the type's minimum applies.
            'min_players' => ['sometimes', 'integer', 'min:'.$type->minPlayers(), 'max:'.$type->maxPlayers(), 'lte:max_players'],
        ];
    }
}
