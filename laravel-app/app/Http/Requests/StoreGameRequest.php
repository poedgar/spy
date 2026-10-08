<?php

namespace App\Http\Requests;

use App\Enums\AgeTier;
use App\Enums\GameMode;
use App\Enums\GameType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Clients that predate age tiers get the full adults pool.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->filled('age_tier')) {
            $this->merge(['age_tier' => AgeTier::Adults->value]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'game_mode' => ['required', 'string', Rule::enum(GameMode::class)],
            'age_tier' => ['required', 'string', Rule::enum(AgeTier::class)],
            'max_players' => ['required', 'integer', 'min:'.GameType::Spy->minPlayers(), 'max:'.GameType::Spy->maxPlayers()],
            'mission_briefing' => ['required', 'string', 'max:2000'],
            'requires_approval' => ['sometimes', 'boolean'],
            'is_listed' => ['sometimes', 'boolean'],
        ];
    }
}
