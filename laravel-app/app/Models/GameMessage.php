<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $game_id
 * @property int $user_id
 * @property string $body
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['game_id', 'user_id', 'body'])]
class GameMessage extends Model
{
    /** How many recent messages a lobby shows. */
    public const RECENT = 50;

    public const MAX_LENGTH = 500;

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

    /**
     * The shape both apps show; never the author's email.
     *
     * @return array{id: int, body: string, created_at: string|null, user: array{id: int, codename: string, name: string}}
     */
    public function present(): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => ['id' => $this->user->id, 'codename' => $this->user->codename, 'name' => $this->user->name],
        ];
    }

    /**
     * The latest messages of a game, oldest first.
     *
     * @return list<array{id: int, body: string, created_at: string|null, user: array{id: int, codename: string, name: string}}>
     */
    public static function recentFor(Game $game): array
    {
        return array_values(self::where('game_id', $game->id)
            ->with('user:id,codename,name')
            ->latest('id')
            ->limit(self::RECENT)
            ->get()
            ->reverse()
            ->map(fn (self $message) => $message->present())
            ->all());
    }
}
