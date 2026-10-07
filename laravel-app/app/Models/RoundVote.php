<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $game_round_id
 * @property int $voter_id
 * @property int $suspect_id
 */
#[Fillable(['game_round_id', 'voter_id', 'suspect_id'])]
class RoundVote extends Model
{
    /**
     * @return BelongsTo<GameRound, $this>
     */
    public function round(): BelongsTo
    {
        return $this->belongsTo(GameRound::class, 'game_round_id');
    }
}
