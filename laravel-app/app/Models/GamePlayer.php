<?php

namespace App\Models;

use App\Enums\PlayerStatus;
use Database\Factories\GamePlayerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $game_id
 * @property int $user_id
 * @property bool $is_host
 * @property PlayerStatus $status
 * @property int $score
 */
#[Fillable(['game_id', 'user_id', 'is_host', 'status', 'score', 'joined_at'])]
class GamePlayer extends Model
{
    /** @use HasFactory<GamePlayerFactory> */
    use HasFactory;

    /**
     * Joining, readiness and scores all count as activity on the game
     * (open games hide ones nobody has touched for a while).
     *
     * @var list<string>
     */
    protected $touches = ['game'];

    protected function casts(): array
    {
        return [
            'is_host' => 'boolean',
            'status' => PlayerStatus::class,
            'joined_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
