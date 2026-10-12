<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An idea or a bug report sent from the home page.
 *
 * @property int $id
 * @property string $kind
 * @property string $message
 * @property string|null $email
 * @property int|null $user_id
 * @property string|null $locale
 * @property string|null $user_agent
 * @property Carbon|null $resolved_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['kind', 'message', 'email', 'user_id', 'locale', 'user_agent', 'resolved_at'])]
class Feedback extends Model
{
    public const KIND_IDEA = 'idea';

    public const KIND_BUG = 'bug';

    public const KINDS = [self::KIND_IDEA, self::KIND_BUG];

    protected $table = 'feedback';

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }
}
