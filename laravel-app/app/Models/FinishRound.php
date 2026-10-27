<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One round of a written game: a phrase, everyone's answer (an ending in
 * Finish the Phrase, an interpretation in Interpret the Phrase), then the
 * vote. The `answers` naming follows Finish the Phrase.
 *
 * @property int $id
 * @property int $game_id
 * @property int $number
 * @property int $prompt_id
 * @property string $text
 * @property string|null $meaning what an interpreted phrase really means
 * @property string|null $image Meme It's picture (see Prompt::urlFor)
 * @property-read Prompt|null $prompt
 * @property array<int|string, string>|null $answers author id => ending
 * @property list<int>|null $answer_order authors, in the order shown for voting
 * @property array<int|string, int>|null $votes voter id => chosen author id
 * @property list<int>|null $winner_user_ids
 * @property string|null $ending
 * @property Carbon $started_at
 * @property Carbon|null $voting_started_at
 * @property Carbon|null $ended_at
 */
#[Fillable(['game_id', 'number', 'prompt_id', 'text', 'meaning', 'image', 'answers', 'answer_order', 'votes', 'winner_user_ids', 'ending', 'started_at', 'voting_started_at', 'ended_at'])]
class FinishRound extends Model
{
    public const ENDING_VOTED = 'voted';

    public const ENDING_ABANDONED = 'abandoned';

    /** Longest ending a player can write. */
    public const MAX_ANSWER_LENGTH = 150;

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'answer_order' => 'array',
            'votes' => 'array',
            'winner_user_ids' => 'array',
            'started_at' => 'datetime',
            'voting_started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function hasEnded(): bool
    {
        return $this->ended_at !== null;
    }

    /**
     * Who has written an ending.
     *
     * @return list<int>
     */
    public function authorIds(): array
    {
        return array_map('intval', array_keys($this->answers ?? []));
    }

    /**
     * The author behind the ending shown at $position, if any.
     */
    public function authorAt(int $position): ?int
    {
        return $this->answer_order[$position] ?? null;
    }

    /**
     * Votes received per author.
     *
     * @return array<int, int>
     */
    public function tally(): array
    {
        $counts = array_fill_keys($this->answer_order ?? $this->authorIds(), 0);

        foreach ($this->votes ?? [] as $authorId) {
            if (array_key_exists((int) $authorId, $counts)) {
                $counts[(int) $authorId]++;
            }
        }

        return $counts;
    }

    /**
     * @return BelongsTo<Prompt, $this>
     */
    public function prompt(): BelongsTo
    {
        return $this->belongsTo(Prompt::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
