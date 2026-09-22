<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
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
            'game_mode' => ['required', 'string', 'in:mole,codebreaker,counterintel'],
            'max_players' => ['required', 'integer', 'min:3', 'max:12'],
            'mission_briefing' => ['required', 'string', 'max:2000'],
        ];
    }
}
