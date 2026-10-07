<?php

namespace App\Support;

use App\Enums\Locale;
use Illuminate\Support\Arr;

/**
 * Read access to the phrase pools in PhraseData.
 *
 * @phpstan-type Phrase array{id: int, text: string}
 */
class PhraseCatalog
{
    /**
     * @return list<Phrase>
     */
    public static function all(Locale $language): array
    {
        return PhraseData::PHRASES[$language->value];
    }

    /**
     * @return Phrase|null
     */
    public static function find(Locale $language, int $id): ?array
    {
        return Arr::first(self::all($language), fn (array $phrase) => $phrase['id'] === $id);
    }

    /**
     * The words players are dealt: split on spaces, with surrounding
     * punctuation dropped ("way," → "way") but inner apostrophes and hyphens
     * kept ("don't", "обіцянка-цяцянка").
     *
     * @return list<string>
     */
    public static function words(string $text): array
    {
        $words = array_map(
            fn (string $token) => (string) preg_replace('/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/u', '', $token),
            preg_split('/\s+/u', trim($text)) ?: [],
        );

        return array_values(array_filter($words, fn (string $word) => $word !== ''));
    }

    /**
     * Guesses are compared loosely: case, punctuation, apostrophe styles and
     * hyphens never decide a win.
     */
    public static function normalize(string $text): string
    {
        $text = mb_strtolower($text);
        $text = (string) preg_replace("/['’ʼ`]/u", '', $text);
        $text = (string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);

        return trim($text);
    }

    public static function matches(Locale $language, int $id, string $guess): bool
    {
        $phrase = self::find($language, $id);

        return $phrase !== null && self::normalize($phrase['text']) === self::normalize($guess);
    }

    /**
     * The largest table a language's pool can deal to.
     */
    public static function longest(Locale $language): int
    {
        return max(array_map(fn (array $phrase) => count(self::words($phrase['text'])), self::all($language)) ?: [0]);
    }

    /**
     * A phrase long enough for every player to hold a distinct word,
     * preferring ones this game has not played yet.
     *
     * @param  list<int>  $playedIds
     */
    public static function randomId(Locale $language, int $minWords, array $playedIds = []): ?int
    {
        $fits = array_values(array_filter(
            self::all($language),
            fn (array $phrase) => count(self::words($phrase['text'])) >= $minWords,
        ));
        $fresh = array_values(array_filter($fits, fn (array $phrase) => ! in_array($phrase['id'], $playedIds, true)));
        $pool = $fresh !== [] ? $fresh : $fits;

        return $pool === [] ? null : Arr::random($pool)['id'];
    }
}
