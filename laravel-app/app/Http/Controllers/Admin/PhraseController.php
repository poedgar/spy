<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GameType;
use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Models\Phrase;
use App\Support\PhraseCatalog;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Phrase game's pools, for site administrators. A round keeps the text
 * it was dealt, so edits only affect new deals; removing a phrase only
 * hides it.
 */
class PhraseController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', Rule::enum(Locale::class)],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));

        $phrases = Phrase::query()
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->whereRaw("lower(text) like ? escape '\\'", [$like]);
            })
            ->when($filters['language'] ?? null, fn ($query, $language) => $query->where('language', $language))
            ->orderBy('language')
            ->orderBy('number')
            ->paginate(self::PER_PAGE, ['id', 'language', 'number', 'text'])
            ->withQueryString()
            ->through(fn (Phrase $phrase) => [
                'id' => $phrase->id,
                'language' => $phrase->language,
                'number' => $phrase->number,
                'text' => $phrase->text,
                'words' => count(PhraseCatalog::words($phrase->text)),
            ]);

        return inertia('admin/Phrases', [
            'phrases' => $phrases,
            'filters' => ['q' => $search, 'language' => $filters['language'] ?? null],
            'pools' => collect(Locale::cases())->mapWithKeys(fn (Locale $language) => [$language->value => [
                'count' => count(PhraseCatalog::all($language)),
                'longest' => PhraseCatalog::longest($language),
            ]]),
            'maxPlayers' => GameType::Phrase->maxPlayers(),
            'minWords' => GameType::Phrase->minPlayers(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Phrase::create($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase added.')]);

        return back();
    }

    public function update(Request $request, Phrase $phrase): RedirectResponse
    {
        $phrase->update($this->validated($request, $phrase));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase saved.')]);

        return back();
    }

    public function destroy(Phrase $phrase): RedirectResponse
    {
        $phrase->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase removed.')]);

        return back();
    }

    /**
     * Every player holds one word, so a phrase needs at least as many words
     * as the smallest table; and the same phrase only once per language.
     *
     * @return array{language: string, text: string}
     */
    private function validated(Request $request, ?Phrase $current = null): array
    {
        $minWords = GameType::Phrase->minPlayers();
        $language = (string) $request->input('language', $current?->language);

        $data = $request->validate([
            'language' => ['required', Rule::enum(Locale::class)],
            'text' => [
                'required', 'string', 'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($minWords, $language, $current) {
                    if (count(PhraseCatalog::words((string) $value)) < $minWords) {
                        $fail(__('A phrase needs at least :count words.', ['count' => $minWords]));

                        return;
                    }

                    $normalized = PhraseCatalog::normalize((string) $value);
                    $duplicate = Phrase::where('language', $language)
                        ->when($current, fn ($query) => $query->whereKeyNot($current?->id))
                        ->pluck('text')
                        ->contains(fn (string $text) => PhraseCatalog::normalize($text) === $normalized);

                    if ($duplicate) {
                        $fail(__('That phrase is already in the list.'));
                    }
                },
            ],
        ]);

        return ['language' => (string) $data['language'], 'text' => trim((string) $data['text'])];
    }
}
