<?php

namespace App\Models;

use App\Support\EmotionCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A face for Name the Emotion, with the emotion it shows and a running
 * count of how often players name it right.
 *
 * @property int $id
 * @property string $image
 * @property string $emotion
 * @property string $variant
 * @property int $base_level
 * @property int $shown_count
 * @property int $correct_count
 * @property bool $active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['image', 'emotion', 'variant', 'base_level', 'shown_count', 'correct_count', 'active'])]
class Face extends Model
{
    protected function casts(): array
    {
        return [
            'base_level' => 'integer',
            'shown_count' => 'integer',
            'correct_count' => 'integer',
            'active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<EmotionRound, $this>
     */
    public function rounds(): HasMany
    {
        return $this->hasMany(EmotionRound::class);
    }

    public function level(): int
    {
        return EmotionCatalog::levelOf($this);
    }

    /** Share of answers that named the right emotion, or null before any. */
    public function hitRate(): ?float
    {
        return $this->shown_count === 0 ? null : $this->correct_count / $this->shown_count;
    }

    public function imageUrl(): string
    {
        return asset($this->image);
    }

    /**
     * Faces in play at a level: by measured hit rate where there is enough
     * data, else by the level they started with.
     *
     * @param  Builder<Face>  $query
     * @return Builder<Face>
     */
    public function scopeAtLevel(Builder $query, int $level): Builder
    {
        $min = EmotionCatalog::MIN_ANSWERS;
        $rate = 'cast(correct_count as float) / shown_count';
        $measured = match ($level) {
            EmotionCatalog::LEVEL_EASY => "{$rate} >= ".EmotionCatalog::EASY_FROM,
            EmotionCatalog::LEVEL_MEDIUM => "{$rate} >= ".EmotionCatalog::MEDIUM_FROM." and {$rate} < ".EmotionCatalog::EASY_FROM,
            default => "{$rate} < ".EmotionCatalog::MEDIUM_FROM,
        };

        return $query->where('active', true)->where(fn ($query) => $query
            ->where(fn ($query) => $query->where('shown_count', '<', $min)->where('base_level', $level))
            ->orWhere(fn ($query) => $query->where('shown_count', '>=', $min)->whereRaw($measured)));
    }
}
