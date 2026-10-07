<?php

namespace App\Support;

use App\Enums\AgeTier;
use Illuminate\Support\Arr;

/**
 * Read access to the location pool in LocationData.
 *
 * @phpstan-type Place array{id: int, en: string, uk: string, category: string, tier: string}
 * @phpstan-type PresentedPlace array{id: int, en: string, uk: string, category: string}
 */
class LocationCatalog
{
    /**
     * @return list<Place>
     */
    public static function all(): array
    {
        return array_map(fn (array $place) => [
            'id' => $place['id'],
            'en' => $place['en'],
            'uk' => $place['uk'],
            'category' => $place['category'],
            'tier' => $place['tier'],
        ], LocationData::PLACES);
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
        $place = $id === null ? null : self::find($id);

        return $place === null ? null : self::presentPlace($place);
    }

    /**
     * @param  Place  $place
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
