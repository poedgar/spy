<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A Finish the Phrase beginning. Removing one only hides it from new rounds.
 *
 * @property int $id
 * @property string $language
 * @property string $text
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['language', 'text'])]
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
