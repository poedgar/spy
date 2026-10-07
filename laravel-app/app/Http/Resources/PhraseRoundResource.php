<?php

namespace App\Http\Resources;

use App\Actions\Phrase\GuessPhrase;
use App\Models\PhraseGuess;
use App\Models\PhraseRound;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One player's view of a Phrase deal. While it runs, a player learns only
 * their own word and its place in the phrase; the phrase and everyone's
 * words are revealed once it ends. Guesses are public: they are made aloud
 * at the table anyway.
 *
 * @mixin PhraseRound
 */
class PhraseRoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;
        $position = $viewerId === null ? null : $this->positionOf($viewerId);
        $words = $this->words();
        $holders = collect($this->assignments)->mapWithKeys(fn (int $wordIndex, int|string $userId) => [$wordIndex => (int) $userId]);

        return [
            'number' => $this->number,
            'language' => $this->language,
            'word_count' => count($words),
            'started_at' => $this->started_at->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'my_word' => $position === null ? null : $words[$position],
            'my_position' => $position === null ? null : $position + 1,
            'question_round' => $this->questionRound(),
            'asker_user_id' => $this->askerId(),
            'turn_order' => $this->turn_order,
            'scoring' => ['win' => GuessPhrase::WIN_POINTS, 'wrong_guess' => -GuessPhrase::WRONG_GUESS_PENALTY],
            'guesses' => $this->guesses->map(fn (PhraseGuess $guess) => [
                'user_id' => $guess->user_id,
                'guess' => $guess->guess,
                'correct' => $guess->correct,
            ])->values(),
            'result' => $this->hasEnded() ? [
                'ending' => $this->ending,
                'winner_user_id' => $this->winner_user_id,
                'phrase' => $this->text(),
                'words' => collect($words)->map(fn (string $word, int $index) => [
                    'position' => $index + 1,
                    'word' => $word,
                    'user_id' => $holders->get($index),
                ])->values(),
            ] : null,
        ];
    }
}
