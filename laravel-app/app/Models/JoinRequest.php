<?php

namespace App\Models;

use App\Enums\InvitationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Someone with the invite code asking for a seat in a game whose host
 * approves new players. Shares the pending/accepted/declined lifecycle of
 * an invitation, seen from the other side.
 *
 * @property int $id
 * @property int $game_id
 * @property int $user_id
 * @property InvitationStatus $status
 */
#[Fillable(['game_id', 'user_id', 'status'])]
class JoinRequest extends Model
{
    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => InvitationStatus::class,
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
