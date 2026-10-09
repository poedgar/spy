<?php

namespace App\Http\Requests;

use App\Enums\GameType;
use App\Enums\Locale;
use App\Models\Game;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePhraseGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Stores "no timer" as null.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        $validated = parent::validated($key, $default);

        if ($key === null && is_array($validated) && empty($validated['round_seconds'])) {
            $validated['round_seconds'] = null;
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'phrase_language' => ['required', 'string', Rule::enum(Locale::class)],
            'max_players' => ['required', 'integer', 'min:'.GameType::Phrase->minPlayers(), 'max:'.GameType::Phrase->maxPlayers()],
            'requires_approval' => ['sometimes', 'boolean'],
            'is_listed' => ['sometimes', 'boolean'],
            // Seconds per round; empty or 0 means no timer.
            'round_seconds' => ['nullable', 'integer', Rule::in(Game::ROUND_TIMER_CHOICES)],
        ];
    }
}
