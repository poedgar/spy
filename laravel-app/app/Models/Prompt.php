<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A phrase for a written game: a Finish the Phrase beginning, or an idiom
 * for Interpret the Phrase (with what it really means). Removing one only
 * hides it from new rounds.
 *
 * @property int $id
 * @property string $game_type
 * @property string $language
 * @property string $text
 * @property string|null $meaning
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['game_type', 'language', 'text', 'meaning'])]
class Prompt extends Model
{
    use SoftDeletes;

    /**
     * @return HasMany<FinishRound, $this>
     */
    public function rounds(): HasMany
    {
        return $this->hasMany(FinishRound::class);
    }
}
