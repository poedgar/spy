<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One Name the Emotion round: a face, the options, everyone's pick.
 *
 * @property int $id
 * @property int $game_id
 * @property int $number
 * @property int $face_id
 * @property int $level
 * @property list<string> $options
 * @property array<int|string, string>|null $answers user id => chosen emotion
 * @property string|null $ending
 * @property Carbon $started_at
 * @property Carbon|null $ended_at
 * @property-read Face $face
 */
#[Fillable(['game_id', 'number', 'face_id', 'level', 'options', 'answers', 'ending', 'started_at', 'ended_at'])]
class EmotionRound extends Model
{
    public const ENDING_REVEALED = 'revealed';

    public const ENDING_ABANDONED = 'abandoned';

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'answers' => 'array',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function hasEnded(): bool
    {
        return $this->ended_at !== null;
    }

    /**
     * Who named the right emotion.
     *
     * @return list<int>
     */
    public function correctUserIds(): array
    {
        $right = $this->face->emotion;

        return array_map('intval', array_keys(array_filter($this->answers ?? [], fn (string $emotion) => $emotion === $right)));
    }

    /**
     * @return BelongsTo<Face, $this>
     */
    public function face(): BelongsTo
    {
        return $this->belongsTo(Face::class);
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
