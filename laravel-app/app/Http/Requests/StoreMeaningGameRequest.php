<?php

namespace App\Http\Requests;

use App\Enums\GameType;

class StoreMeaningGameRequest extends StoreFinishGameRequest
{
    public function gameType(): GameType
    {
        return GameType::Meaning;
    }
}
