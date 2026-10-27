<?php

namespace App\Support;

use App\Models\Face;

/**
 * Name the Emotion's rules of thumb: the emotions on offer, how many
 * options each level shows, and when a face's measured hit rate overrides
 * the level it started with.
 *
 * The six basic emotions follow Ekman's cross-cultural studies; neutral is
 * the usual seventh choice in validated face sets. The thresholds mirror
 * how those sets rate their photos: by the share of people who name the
 * intended emotion.
 */
class EmotionCatalog
{
    public const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];

    public const LEVEL_EASY = 1;

    public const LEVEL_MEDIUM = 2;

    public const LEVEL_HARD = 3;

    public const LEVELS = [self::LEVEL_EASY, self::LEVEL_MEDIUM, self::LEVEL_HARD];

    /** Options shown per level, the right one included. */
    public const OPTIONS = [self::LEVEL_EASY => 4, self::LEVEL_MEDIUM => 6, self::LEVEL_HARD => 7];

    /** Answers a face needs before its hit rate decides its level. */
    public const MIN_ANSWERS = 20;

    /** Hit rates (0–1) at or above which a face counts as easy, or medium. */
    public const EASY_FROM = 0.85;

    public const MEDIUM_FROM = 0.6;

    /** The level a face plays at: measured once there is enough data. */
    public static function levelOf(Face $face): int
    {
        if ($face->shown_count < self::MIN_ANSWERS) {
            return $face->base_level;
        }

        $rate = $face->correct_count / $face->shown_count;

        return match (true) {
            $rate >= self::EASY_FROM => self::LEVEL_EASY,
            $rate >= self::MEDIUM_FROM => self::LEVEL_MEDIUM,
            default => self::LEVEL_HARD,
        };
    }

    /**
     * The right emotion plus random others, shuffled.
     *
     * @return list<string>
     */
    public static function optionsFor(string $emotion, int $level): array
    {
        $others = array_values(array_diff(self::EMOTIONS, [$emotion]));
        shuffle($others);

        $options = array_slice($others, 0, self::OPTIONS[$level] - 1);
        $options[] = $emotion;
        shuffle($options);

        return $options;
    }
}
