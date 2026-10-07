<?php

namespace App\Http\Requests;

use App\Enums\GameType;
use App\Enums\Locale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePhraseGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'phrase_language' => ['required', 'string', Rule::enum(Locale::class)],
            'max_players' => ['required', 'integer', 'min:3', 'max:'.GameType::Phrase->maxPlayers()],
        ];
    }
}
