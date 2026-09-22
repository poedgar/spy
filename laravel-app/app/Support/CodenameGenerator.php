<?php

namespace App\Support;

class CodenameGenerator
{
    /**
     * @var list<string>
     */
    private const CODENAMES = [
        'SHADOW_FOX',
        'NIGHT_HAWK',
        'CIPHER_NINE',
        'GHOST_PROTOCOL',
        'VIPER_ONE',
        'COVERT_RAVEN',
    ];

    public static function forName(string $name): string
    {
        $sum = array_sum(array_map('ord', str_split($name)));

        return self::CODENAMES[$sum % count(self::CODENAMES)];
    }
}
