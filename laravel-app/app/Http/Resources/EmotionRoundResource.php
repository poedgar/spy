<?php

namespace App\Http\Resources;

use App\Actions\Emotion\RevealEmotion;
use App\Models\EmotionRound;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One player's view of a Name the Emotion round. Until the reveal, only
 * who has answered shows (and your own pick); then the right emotion,
 * everyone's picks and how often players name this face right overall.
 *
 * @mixin EmotionRound
 */
class EmotionRoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;
        $answers = $this->answers ?? [];
        $ended = $this->hasEnded();
        $face = $this->face;
        $hitRate = $face->hitRate();

        return [
            'number' => $this->number,
            'level' => $this->level,
            'image_url' => $face->imageUrl(),
            'options' => $this->options,
            'answered_user_ids' => array_map('intval', array_keys($answers)),
            'my_answer' => $viewerId === null ? null : ($answers[$viewerId] ?? null),
            'scoring' => ['win' => RevealEmotion::WIN_POINTS],
            'started_at' => $this->started_at->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'result' => $ended ? [
                'ending' => $this->ending,
                'emotion' => $face->emotion,
                'variant' => $face->variant,
                'answers' => collect($answers)->map(fn (string $emotion, int|string $userId) => [
                    'user_id' => (int) $userId,
                    'emotion' => $emotion,
                    'correct' => $emotion === $face->emotion,
                ])->values(),
                // Across every game so far: how recognisable this face is.
                'hit_rate' => $hitRate === null ? null : round($hitRate, 2),
                'answers_so_far' => $face->shown_count,
            ] : null,
        ];
    }
}
