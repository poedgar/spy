<?php

namespace App\Support;

/**
 * Reading the YouTube links admins paste for Sing It Out clips, and the
 * player link the games embed.
 */
class YouTube
{
    private const ID = '[A-Za-z0-9_-]{11}';

    /**
     * The video in a watch, share, Shorts or embed link (or a bare video id).
     */
    public static function videoId(string $link): ?string
    {
        $link = trim($link);

        if (preg_match('/^'.self::ID.'$/', $link) === 1) {
            return $link;
        }

        $pattern = '~^(?:https?://)?(?:(?:www|m|music)\.)?(?:'
            .'youtube(?:-nocookie)?\.com/(?:watch\?(?:[^#]*&)?v=|embed/|shorts/|live/|v/)'
            .'|youtu\.be/)('.self::ID.')(?![A-Za-z0-9_-])~i';

        return preg_match($pattern, $link, $match) === 1 ? $match[1] : null;
    }

    /**
     * Where a link says to start (?t=75, ?t=1m15s, &start=75), in seconds.
     */
    public static function startIn(string $link): ?int
    {
        if (preg_match('~[?&#](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?(?:&|$)~', $link, $match) !== 1) {
            return null;
        }

        $seconds = (int) ($match[1] ?? 0) * 3600 + (int) ($match[2] ?? 0) * 60 + (int) ($match[3] ?? 0);

        return $seconds > 0 ? $seconds : null;
    }

    /**
     * "1:15", "01:02:03" or "75" in seconds; null when it is none of those.
     */
    public static function seconds(?string $time): ?int
    {
        $time = trim((string) $time);

        if (preg_match('/^\d{1,5}(?::[0-5]?\d){0,2}$/', $time) !== 1) {
            return null;
        }

        return array_reduce(explode(':', $time), fn (int $total, string $part) => $total * 60 + (int) $part, 0);
    }

    /** 75 as "1:15". */
    public static function clock(int $seconds): string
    {
        return intdiv($seconds, 60).':'.str_pad((string) ($seconds % 60), 2, '0', STR_PAD_LEFT);
    }

    /**
     * The embedded player for a stretch of a video: no related videos from
     * other channels afterwards, and inline on iPhones.
     */
    public static function embedUrl(string $videoId, int $start = 0, ?int $end = null): string
    {
        return 'https://www.youtube-nocookie.com/embed/'.$videoId.'?'.http_build_query(array_filter([
            'start' => $start ?: null,
            'end' => $end,
            'rel' => 0,
            'playsinline' => 1,
        ], fn ($value) => $value !== null));
    }

    public static function watchUrl(string $videoId, int $start = 0): string
    {
        return 'https://www.youtube.com/watch?v='.$videoId.($start > 0 ? '&t='.$start.'s' : '');
    }
}
