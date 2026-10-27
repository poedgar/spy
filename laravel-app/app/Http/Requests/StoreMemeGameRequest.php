<?php

namespace App\Http\Requests;

use App\Enums\GameType;

/**
 * A new Meme It game. Its pictures have no language, so none is asked for.
 */
class StoreMemeGameRequest extends StoreFinishGameRequest
{
    public function gameType(): GameType
    {
        return GameType::Meme;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_diff_key(parent::rules(), ['phrase_language' => true]);
    }
}
