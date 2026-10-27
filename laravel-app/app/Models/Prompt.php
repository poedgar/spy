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
 * @property string|null $language none for Meme It's pictures
 * @property string $text a picture's description, for Meme It
 * @property string|null $meaning
 * @property string|null $image Meme It: a path under public/, or a link
 * @property string|null $credit what the picture's licence asks us to show
 * @property string|null $source_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['game_type', 'language', 'text', 'meaning', 'image', 'credit', 'source_url'])]
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

    public function imageUrl(): ?string
    {
        return self::urlFor($this->image);
    }

    /** Pictures that ship with the app are paths; others are links. */
    public static function urlFor(?string $image): ?string
    {
        if ($image === null) {
            return null;
        }

        return preg_match('~^https?://~', $image) === 1 ? $image : asset($image);
    }
}
