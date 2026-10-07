<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Arr;

/**
 * Codenames are unique per user (players pick one in their profile, or get
 * a generated one at sign-up), so lobbies never show two identical names.
 */
class CodenameGenerator
{
    /**
     * @var list<string>
     */
    private const ADJECTIVES = [
        'SHADOW', 'NIGHT', 'SILENT', 'GHOST', 'COVERT', 'CRIMSON', 'IRON', 'GOLDEN', 'SILVER', 'ARCTIC',
        'DESERT', 'NEON', 'STORM', 'VELVET', 'COBALT', 'SCARLET', 'HIDDEN', 'SWIFT', 'LUCKY', 'MIDNIGHT',
        'COPPER', 'JADE', 'AMBER', 'ONYX', 'FROST', 'EMBER', 'RAPID', 'QUIET', 'BRAVE', 'CLEVER',
        'WILD', 'NOBLE', 'SHARP', 'STEEL', 'MISTY', 'SOLAR', 'LUNAR', 'ROGUE', 'SECRET', 'PHANTOM',
    ];

    /**
     * @var list<string>
     */
    private const NOUNS = [
        'FOX', 'HAWK', 'RAVEN', 'VIPER', 'WOLF', 'FALCON', 'LYNX', 'COBRA', 'OWL', 'PANTHER',
        'TIGER', 'SPARROW', 'BADGER', 'OTTER', 'HERON', 'JACKAL', 'MANTIS', 'ORCA', 'PUMA', 'RAVEN',
        'CIPHER', 'ECHO', 'SIGNAL', 'COMPASS', 'ANCHOR', 'ARROW', 'BEACON', 'COMET', 'DAGGER', 'LANTERN',
        'MIRAGE', 'NOMAD', 'ORBIT', 'PILOT', 'QUILL', 'RANGER', 'SCOUT', 'TALON', 'VECTOR', 'WRAITH',
    ];

    /**
     * Codenames are upper case letters, digits and underscores, 3 to 24 long.
     */
    public const PATTERN = '/^[A-Z0-9_]{3,24}$/';

    public static function random(): string
    {
        return Arr::random(self::ADJECTIVES).'_'.Arr::random(self::NOUNS);
    }

    /**
     * A generated codename nobody has yet. 1,600 word pairs come first; a
     * number suffix takes over if those ever run out.
     */
    public static function unique(): string
    {
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $candidate = self::random();

            if (! User::where('codename', $candidate)->exists()) {
                return $candidate;
            }
        }

        do {
            $candidate = self::random().'_'.random_int(10, 9999);
        } while (User::where('codename', $candidate)->exists());

        return $candidate;
    }

    /**
     * How a typed codename is stored: "night owl" → "NIGHT_OWL".
     */
    public static function normalize(string $codename): string
    {
        return (string) preg_replace('/\s+/', '_', mb_strtoupper(trim($codename)));
    }
}
