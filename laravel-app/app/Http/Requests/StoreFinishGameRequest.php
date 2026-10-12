<?php

namespace App\Http\Requests;

use App\Enums\GameType;
use App\Enums\Locale;
use App\Support\GameNameGenerator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A new written game: Finish the Phrase here, Interpret the Phrase in the
 * subclass.
 */
class StoreFinishGameRequest extends FormRequest
{
    public function gameType(): GameType
    {
        return GameType::Finish;
    }

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
            $validated['title'] = GameNameGenerator::for($this->gameType());
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
            // The language of the phrases dealt.
            'phrase_language' => ['required', 'string', Rule::enum(Locale::class)],
            'max_players' => ['required', 'integer', 'min:'.$this->gameType()->minPlayers(), 'max:'.$this->gameType()->maxPlayers()],
            'requires_approval' => ['sometimes', 'boolean'],
            'is_listed' => ['sometimes', 'boolean'],
        ];
    }
}
