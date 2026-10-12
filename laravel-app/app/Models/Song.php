<?php

namespace App\Models;

use App\Support\YouTube;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A clip for Sing It Out: a stretch of a YouTube video, added on the admin
 * pages. Removing one only hides it from new rounds.
 *
 * @property int $id
 * @property string $title
 * @property string|null $artist
 * @property string $youtube_id
 * @property int $start_seconds
 * @property int|null $end_seconds
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['title', 'artist', 'youtube_id', 'start_seconds', 'end_seconds'])]
class Song extends Model
{
    use SoftDeletes;

    /**
     * @return HasMany<SongRound, $this>
     */
    public function rounds(): HasMany
    {
        return $this->hasMany(SongRound::class);
    }

    public function embedUrl(): string
    {
        return YouTube::embedUrl($this->youtube_id, $this->start_seconds, $this->end_seconds);
    }

    protected function casts(): array
    {
        return [
            'start_seconds' => 'integer',
            'end_seconds' => 'integer',
        ];
    }
}
