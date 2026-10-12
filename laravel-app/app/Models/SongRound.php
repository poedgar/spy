<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One Sing It Out round: a clip, the singing order, then everyone's vote.
 *
 * @property int $id
 * @property int $game_id
 * @property int $number
 * @property int $song_id
 * @property list<int> $turn_order
 * @property int $turn_index
 * @property array<int|string, int>|null $votes voter id => chosen singer id
 * @property list<int>|null $winner_user_ids
 * @property string|null $ending
 * @property Carbon $started_at
 * @property Carbon|null $voting_started_at
 * @property Carbon|null $ended_at
 * @property-read Song|null $song
 */
#[Fillable(['game_id', 'number', 'song_id', 'turn_order', 'turn_index', 'votes', 'winner_user_ids', 'ending', 'started_at', 'voting_started_at', 'ended_at'])]
class SongRound extends Model
{
    public const ENDING_VOTED = 'voted';

    public const ENDING_ABANDONED = 'abandoned';

    protected function casts(): array
    {
        return [
            'turn_order' => 'array',
            'votes' => 'array',
            'winner_user_ids' => 'array',
            'started_at' => 'datetime',
            'voting_started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /** Who is singing now, or null once everyone has. */
    public function singerId(): ?int
    {
        return $this->turn_order[$this->turn_index] ?? null;
    }

    public function everyoneSang(): bool
    {
        return $this->turn_index >= count($this->turn_order);
    }

    public function hasEnded(): bool
    {
        return $this->ended_at !== null;
    }

    /**
     * Votes received per singer.
     *
     * @return array<int, int>
     */
    public function tally(): array
    {
        $counts = array_fill_keys($this->turn_order, 0);

        foreach ($this->votes ?? [] as $singerId) {
            if (array_key_exists((int) $singerId, $counts)) {
                $counts[(int) $singerId]++;
            }
        }

        return $counts;
    }

    /**
     * Even removed clips: a round keeps the song it was dealt.
     *
     * @return BelongsTo<Song, $this>
     */
    public function song(): BelongsTo
    {
        return $this->belongsTo(Song::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
