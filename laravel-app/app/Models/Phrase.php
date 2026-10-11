<?php

namespace App\Models;

use App\Support\PhraseCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A Phrase-game phrase. `number` is its id within its language (what
 * phrase_rounds store). Removing one only hides it from new deals.
 *
 * @property int $id
 * @property string $language
 * @property int $number
 * @property string $text
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['language', 'number', 'text'])]
class Phrase extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['number' => 'integer'];
    }

    protected static function booted(): void
    {
        // New phrases take the next number in their language.
        static::creating(function (Phrase $phrase) {
            $phrase->number ??= ((int) static::withTrashed()->where('language', $phrase->language)->max('number')) + 1;
        });
        static::saved(fn () => PhraseCatalog::forget());
        static::deleted(fn () => PhraseCatalog::forget());
        static::restored(fn () => PhraseCatalog::forget());
    }
}
