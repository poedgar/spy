<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GameType;
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
 * The written games' phrases, for site administrators: Finish the Phrase
 * beginnings and Interpret the Phrase idioms (with their real meaning). A
 * round keeps the text it was dealt, so edits only affect new rounds;
 * removing one only hides it.
 */
class PromptController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', Rule::enum(Locale::class)],
            'game' => ['nullable', Rule::in(self::games())],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));

        $prompts = Prompt::query()
            ->withCount('rounds')
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->where(fn ($query) => $query
                    ->whereRaw("lower(text) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(coalesce(meaning, '')) like ? escape '\\'", [$like]));
            })
            ->when($filters['game'] ?? null, fn ($query, $game) => $query->where('game_type', $game))
            ->when($filters['language'] ?? null, fn ($query, $language) => $query->where('language', $language))
            ->orderBy('game_type')
            ->orderBy('language')
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Prompt $prompt) => [
                'id' => $prompt->id,
                'game' => $prompt->game_type,
                'language' => $prompt->language,
                'text' => $prompt->text,
                'meaning' => $prompt->meaning,
                'rounds' => (int) $prompt->getAttribute('rounds_count'),
            ]);

        return inertia('admin/Prompts', [
            'prompts' => $prompts,
            'filters' => ['q' => $search, 'language' => $filters['language'] ?? null, 'game' => $filters['game'] ?? null],
            'counts' => collect(self::games())->mapWithKeys(fn (string $game) => [
                $game => collect(Locale::cases())->mapWithKeys(fn (Locale $language) => [
                    $language->value => Prompt::where('game_type', $game)->where('language', $language->value)->count(),
                ]),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Prompt::create($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase added.')]);

        return back();
    }

    public function update(Request $request, Prompt $prompt): RedirectResponse
    {
        $prompt->update($this->validated($request, $prompt));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase saved.')]);

        return back();
    }

    public function destroy(Prompt $prompt): RedirectResponse
    {
        $prompt->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Phrase removed.')]);

        return back();
    }

    /**
     * @return list<string>
     */
    private static function games(): array
    {
        return array_values(array_map(
            fn (GameType $type) => $type->value,
            array_filter(GameType::cases(), fn (GameType $type) => $type->isWritten()),
        ));
    }

    /**
     * The same phrase only once per game and language. Only Interpret the
     * Phrase keeps a real meaning.
     *
     * @return array{game_type: string, language: string, text: string, meaning: string|null}
     */
    private function validated(Request $request, ?Prompt $current = null): array
    {
        $language = (string) $request->input('language', $current?->language);
        $game = (string) $request->input('game', $current?->game_type);

        $data = $request->validate([
            'game' => ['required', Rule::in(self::games())],
            'language' => ['required', Rule::enum(Locale::class)],
            'meaning' => ['nullable', 'string', 'max:255'],
            'text' => [
                'required', 'string', 'min:3', 'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($game, $language, $current) {
                    $normalized = mb_strtolower(trim((string) $value));
                    $duplicate = Prompt::where('game_type', $game)
                        ->where('language', $language)
                        ->when($current, fn ($query) => $query->whereKeyNot($current?->id))
                        ->whereRaw('lower(text) = ?', [$normalized])
                        ->exists();

                    if ($duplicate) {
                        $fail(__('That phrase is already in the list.'));
                    }
                },
            ],
        ]);

        $meaning = trim((string) ($data['meaning'] ?? ''));

        return [
            'game_type' => (string) $data['game'],
            'language' => (string) $data['language'],
            'text' => trim((string) $data['text']),
            'meaning' => $data['game'] === GameType::Meaning->value && $meaning !== '' ? $meaning : null,
        ];
    }
}
