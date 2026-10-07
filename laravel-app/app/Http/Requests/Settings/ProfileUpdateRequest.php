<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Support\CodenameGenerator;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('codename'))) {
            $this->merge(['codename' => CodenameGenerator::normalize($this->input('codename'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->profileRules($this->user()->id);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'codename.regex' => __('Codenames use 3 to 24 letters, digits or underscores.'),
            'codename.unique' => __('That codename is already taken.'),
        ];
    }
}
