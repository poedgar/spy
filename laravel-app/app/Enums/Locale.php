<?php

namespace App\Enums;

enum Locale: string
{
    case English = 'en';
    case Ukrainian = 'uk';

    /**
     * The best supported match for an Accept-Language style value, e.g.
     * "uk-UA,uk;q=0.9,en;q=0.8" → Ukrainian.
     */
    public static function fromHeader(?string $header): ?self
    {
        foreach (explode(',', (string) $header) as $part) {
            $tag = strtolower(substr(trim(explode(';', $part)[0]), 0, 2));

            if ($locale = self::tryFrom($tag)) {
                return $locale;
            }
        }

        return null;
    }
}
