<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Models\Prompt;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Finish the Phrase's beginnings, for site administrators. A round keeps the
 * text it was dealt, so edits only affect new rounds; removing one only
 * hides it.
 */
class PromptController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', Rule::enum(Locale::class)],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));

        $prompts = Prompt::query()
            ->withCount('rounds')
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->whereRaw("lower(text) like ? escape '\\'", [$like]);
            })
            ->when($filters['language'] ?? null, fn ($query, $language) => $query->where('language', $language))
            ->orderBy('language')
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Prompt $prompt) => [
                'id' => $prompt->id,
                'language' => $prompt->language,
                'text' => $prompt->text,
                'rounds' => (int) $prompt->getAttribute('rounds_count'),
            ]);

        return inertia('admin/Prompts', [
            'prompts' => $prompts,
            'filters' => ['q' => $search, 'language' => $filters['language'] ?? null],
            'counts' => collect(Locale::cases())->mapWithKeys(fn (Locale $language) => [
                $language->value => Prompt::where('language', $language->value)->count(),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Prompt::create($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Beginning added.')]);

        return back();
    }

    public function update(Request $request, Prompt $prompt): RedirectResponse
    {
        $prompt->update($this->validated($request, $prompt));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Beginning saved.')]);

        return back();
    }

    public function destroy(Prompt $prompt): RedirectResponse
    {
        $prompt->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Beginning removed.')]);

        return back();
    }

    /**
     * The same beginning only once per language.
     *
     * @return array{language: string, text: string}
     */
    private function validated(Request $request, ?Prompt $current = null): array
    {
        $language = (string) $request->input('language', $current?->language);

        $data = $request->validate([
            'language' => ['required', Rule::enum(Locale::class)],
            'text' => [
                'required', 'string', 'min:3', 'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($language, $current) {
                    $normalized = mb_strtolower(trim((string) $value));
                    $duplicate = Prompt::where('language', $language)
                        ->when($current, fn ($query) => $query->whereKeyNot($current?->id))
                        ->whereRaw('lower(text) = ?', [$normalized])
                        ->exists();

                    if ($duplicate) {
                        $fail(__('That beginning is already in the list.'));
                    }
                },
            ],
        ]);

        return ['language' => (string) $data['language'], 'text' => trim((string) $data['text'])];
    }
}
