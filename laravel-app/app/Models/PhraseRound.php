<?php

namespace App\Models;

use App\Enums\Locale;
use App\Enums\PhraseEnding;
use App\Support\PhraseCatalog;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One deal of a Phrase game: a hidden phrase, one of its words per player,
 * and the order in which players take turns to ask questions out loud.
 *
 * @property int $id
 * @property int $game_id
 * @property int $number
 * @property Locale $language
 * @property int $phrase_id
 * @property array<int|string, int> $assignments user id => 0-based word position
 * @property list<int> $turn_order
 * @property int $turn_index
 * @property Carbon $started_at
 * @property Carbon|null $ends_at
 * @property Carbon|null $ended_at
 * @property PhraseEnding|null $ending
 * @property int|null $winner_user_id
 */
#[Fillable(['game_id', 'number', 'language', 'phrase_id', 'assignments', 'turn_order', 'turn_index', 'started_at', 'ends_at', 'ended_at', 'ending', 'winner_user_id'])]
class PhraseRound extends Model
{
    protected function casts(): array
    {
        return [
            'language' => Locale::class,
            'assignments' => 'array',
            'turn_order' => 'array',
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
            'ended_at' => 'datetime',
            'ending' => PhraseEnding::class,
        ];
    }

    public function hasEnded(): bool
    {
        return $this->ended_at !== null;
    }

    public function text(): string
    {
        return PhraseCatalog::find($this->language, $this->phrase_id)['text'] ?? '';
    }

    /**
     * @return list<string>
     */
    public function words(): array
    {
        return PhraseCatalog::words($this->text());
    }

    public function positionOf(int $userId): ?int
    {
        return $this->assignments[$userId] ?? null;
    }

    public function wordOf(int $userId): ?string
    {
        $position = $this->positionOf($userId);

        return $position === null ? null : ($this->words()[$position] ?? null);
    }

    /**
     * Whose turn it is to ask, cycling through the order dealt at the start.
     */
    public function askerId(): ?int
    {
        $count = count($this->turn_order);

        return $count === 0 ? null : $this->turn_order[$this->turn_index % $count];
    }

    /**
     * Question rounds are 1-based: everyone asks once per question round.
     */
    public function questionRound(): int
    {
        $count = max(1, count($this->turn_order));

        return intdiv($this->turn_index, $count) + 1;
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * @return HasMany<PhraseGuess, $this>
     */
    public function guesses(): HasMany
    {
        return $this->hasMany(PhraseGuess::class)->orderBy('id');
    }
}
