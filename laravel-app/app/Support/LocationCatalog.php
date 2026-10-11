<?php

namespace App\Support;

use App\Enums\AgeTier;
use App\Models\Location;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;

/**
 * Read access to the location pool (the locations table, edited on the
 * admin pages). Read through a cache that every change clears.
 *
 * @phpstan-type Place array{id: int, en: string, uk: string, category: string, tier: string}
 * @phpstan-type PresentedPlace array{id: int, en: string, uk: string, category: string}
 */
class LocationCatalog
{
    private const CACHE_KEY = 'catalog:locations';

    /**
     * Locations that can be dealt and guessed.
     *
     * @return list<Place>
     */
    public static function all(): array
    {
        return array_values(array_map(
            fn (array $row) => [
                'id' => $row['id'],
                'en' => $row['en'],
                'uk' => $row['uk'],
                'category' => $row['category'],
                'tier' => $row['tier'],
            ],
            array_filter(self::rows(), fn (array $row) => ! $row['removed']),
        ));
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Every location ever offered, removed ones included (past rounds
     * still name them).
     *
     * @return list<array{id: int, en: string, uk: string, category: string, tier: string, removed: bool}>
     */
    private static function rows(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, fn () => array_values(Location::withTrashed()
            ->orderBy('id')
            ->get()
            ->map(fn (Location $location) => [
                'id' => $location->id,
                'en' => $location->en,
                'uk' => $location->uk,
                'category' => $location->category,
                'tier' => $location->tier,
                'removed' => $location->deleted_at !== null,
            ])
            ->all()));
    }

    /**
     * @return list<Place>
     */
    public static function forTier(AgeTier $tier): array
    {
        $tiers = array_map(fn (AgeTier $included) => $included->value, $tier->includedTiers());

        return array_values(array_filter(self::all(), fn (array $place) => in_array($place['tier'], $tiers, true)));
    }

    /**
     * @return Place|null
     */
    public static function find(int $id): ?array
    {
        return Arr::first(self::all(), fn (array $place) => $place['id'] === $id);
    }

    public static function randomId(AgeTier $tier): int
    {
        return Arr::random(self::forTier($tier))['id'];
    }

    /**
     * A place shaped for clients: both names travel together so a client can
     * show either language without another request.
     *
     * @return PresentedPlace|null
     */
    public static function present(?int $id): ?array
    {
        $place = $id === null ? null : Arr::first(self::rows(), fn (array $row) => $row['id'] === $id);

        return $place === null ? null : self::presentPlace($place);
    }

    /**
     * @param  array{id: int, en: string, uk: string, category: string}  $place
     * @return PresentedPlace
     */
    public static function presentPlace(array $place): array
    {
        return [
            'id' => $place['id'],
            'en' => $place['en'],
            'uk' => $place['uk'],
            'category' => $place['category'],
        ];
    }

    /**
     * The pool a game of this tier draws from, shaped for clients.
     *
     * @return list<PresentedPlace>
     */
    public static function presentTier(AgeTier $tier): array
    {
        return array_map(self::presentPlace(...), self::forTier($tier));
    }

    /**
     * @return array<string, array{en: string, uk: string}>
     */
    public static function categories(): array
    {
        return LocationData::CATEGORIES;
    }
}
