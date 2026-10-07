<?php

namespace App\Models;

use App\Enums\AgeTier;
use App\Enums\GameMode;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\Locale;
use App\Exceptions\GameRuleException;
use Database\Factories\GameFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $code
 * @property string $title
 * @property GameType $game_type
 * @property GameMode|null $game_mode
 * @property Locale|null $phrase_language
 * @property AgeTier $age_tier
 * @property GameStatus $status
 * @property int $host_id
 * @property int $max_players
 * @property bool $requires_approval
 * @property int|null $players_count
 */
#[Fillable(['title', 'game_mode', 'age_tier', 'phrase_language', 'code', 'host_id', 'max_players', 'mission_briefing', 'status', 'game_type', 'requires_approval'])]
class Game extends Model
{
    /** @use HasFactory<GameFactory> */
    use HasFactory;

    public const MIN_PLAYERS = 3;

    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    /**
     * Mirrors the column defaults so a freshly created model has them too.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'recruiting',
        'age_tier' => 'adults',
        'game_type' => 'spy',
    ];

    protected function casts(): array
    {
        return [
            'game_type' => GameType::class,
            'game_mode' => GameMode::class,
            'phrase_language' => Locale::class,
            'requires_approval' => 'boolean',
            'age_tier' => AgeTier::class,
            'status' => GameStatus::class,
        ];
    }

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
     * 3-4 players: 1 spy, 5-7: 2, 8-10: 3, then one more per 3 players.
     */
    public static function spyCountFor(int $playerCount): int
    {
        if ($playerCount < 5) {
            return 1;
        }

        if ($playerCount < 8) {
            return 2;
        }

        return 1 + intdiv($playerCount - 2, 3);
    }

    /**
     * Guards actions that belong to one game: Spy's vote makes no sense in a
     * Phrase game and vice versa.
     *
     * @throws GameRuleException
     */
    public function ensureType(GameType $type): void
    {
        if ($this->game_type !== $type) {
            throw new GameRuleException('game', __('That action is not part of this game.'));
        }
    }

    public function isHost(User $user): bool
    {
        return $this->host_id === $user->id;
    }

    public function hasPlayer(User|int $user): bool
    {
        $userId = $user instanceof User ? $user->id : $user;

        return $this->relationLoaded('players')
            ? $this->players->contains('user_id', $userId)
            : $this->players()->where('user_id', $userId)->exists();
    }

    /**
     * Re-reads the game row under a write lock, so roster and round changes
     * made inside the surrounding transaction cannot race each other.
     */
    public function freshLocked(): self
    {
        return self::whereKey($this->id)->lockForUpdate()->firstOrFail();
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
        return $this->hasMany(GamePlayer::class)->orderBy('joined_at')->orderBy('id');
    }

    /**
     * @return HasMany<Invitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    /**
     * @return HasMany<JoinRequest, $this>
     */
    public function joinRequests(): HasMany
    {
        return $this->hasMany(JoinRequest::class);
    }

    /**
     * @return HasMany<GameRound, $this>
     */
    public function rounds(): HasMany
    {
        return $this->hasMany(GameRound::class);
    }

    /**
     * @return HasOne<GameRound, $this>
     */
    public function currentRound(): HasOne
    {
        return $this->hasOne(GameRound::class)->latestOfMany('number');
    }

    /**
     * @return HasMany<PhraseRound, $this>
     */
    public function phraseRounds(): HasMany
    {
        return $this->hasMany(PhraseRound::class);
    }

    /**
     * @return HasOne<PhraseRound, $this>
     */
    public function currentPhraseRound(): HasOne
    {
        return $this->hasOne(PhraseRound::class)->latestOfMany('number');
    }
}
