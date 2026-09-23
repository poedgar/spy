<?php

namespace App\Models;

use Database\Factories\GameFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'game_mode', 'code', 'host_id', 'max_players', 'mission_briefing', 'secret_location', 'status'])]
class Game extends Model
{
    /** @use HasFactory<GameFactory> */
    use HasFactory;

    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public static function generateUniqueCode(): string
    {
        do {
            $code = 'SPY-'.collect(range(1, 4))
                ->map(fn () => self::CODE_CHARS[random_int(0, strlen(self::CODE_CHARS) - 1)])
                ->implode('');
        } while (self::where('code', $code)->exists());

        return $code;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    /**
     * @return HasMany<GamePlayer, $this>
     */
    public function players(): HasMany
    {
        return $this->hasMany(GamePlayer::class)->orderBy('joined_at');
    }

    /**
     * @return HasMany<Invitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }
}
