<?php

namespace App\Http\Requests;

use App\Enums\GameType;
use App\Support\GameNameGenerator;
use Illuminate\Foundation\Http\FormRequest;

class StoreSongGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * No name given: the app picks one, as the create forms suggest.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        $validated = parent::validated($key, $default);

        if ($key === null && is_array($validated) && blank($validated['title'] ?? null)) {
            $validated['title'] = GameNameGenerator::for(GameType::Song);
        }

        return $validated;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'max_players' => ['required', 'integer', 'min:'.GameType::Song->minPlayers(), 'max:'.GameType::Song->maxPlayers()],
            'requires_approval' => ['sometimes', 'boolean'],
            'is_listed' => ['sometimes', 'boolean'],
        ];
    }
}
