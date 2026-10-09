<?php

namespace App\Models;

use App\Enums\RoundEnding;
use App\Enums\Team;
use Database\Factories\GameRoundFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One round of a game: a secret location and the spies who don't know it.
 *
 * @property int $id
 * @property int $game_id
 * @property int $number
 * @property int $location_id
 * @property list<int> $spy_user_ids
 * @property Carbon $started_at
 * @property Carbon|null $ends_at
 * @property Carbon|null $voting_started_at
 * @property Carbon|null $ended_at
 * @property RoundEnding|null $ending
 * @property Team|null $winning_team
 * @property int|null $accused_user_id
 * @property int|null $guessed_by_user_id
 * @property int|null $guessed_location_id
 */
#[Fillable(['game_id', 'number', 'location_id', 'spy_user_ids', 'started_at', 'ends_at', 'voting_started_at', 'ended_at', 'ending', 'winning_team', 'accused_user_id', 'guessed_by_user_id', 'guessed_location_id'])]
class GameRound extends Model
{
    /** @use HasFactory<GameRoundFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'spy_user_ids' => 'array',
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
            'voting_started_at' => 'datetime',
            'ended_at' => 'datetime',
            'ending' => RoundEnding::class,
            'winning_team' => Team::class,
        ];
    }

    public function isSpy(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        return in_array($userId, $this->spy_user_ids, true);
    }

    public function hasEnded(): bool
    {
        return $this->ended_at !== null;
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * @return HasMany<RoundVote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(RoundVote::class);
    }
}
