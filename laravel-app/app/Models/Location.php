<?php

namespace App\Models;

use App\Support\LocationCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A Spy location. Edited on the admin pages; removing one only hides it
 * from new rounds.
 *
 * @property int $id
 * @property string $en
 * @property string $uk
 * @property string $category
 * @property string $tier
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['en', 'uk', 'category', 'tier'])]
class Location extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::saved(fn () => LocationCatalog::forget());
        static::deleted(fn () => LocationCatalog::forget());
        static::restored(fn () => LocationCatalog::forget());
    }
}
