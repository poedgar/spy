<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $phrase_round_id
 * @property int $user_id
 * @property string $guess
 * @property bool $correct
 */
#[Fillable(['phrase_round_id', 'user_id', 'guess', 'correct'])]
class PhraseGuess extends Model
{
    protected function casts(): array
    {
        return [
            'correct' => 'boolean',
        ];
    }
}
