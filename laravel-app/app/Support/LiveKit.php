<?php

namespace App\Support;

use App\Models\Game;
use App\Models\User;

/**
 * Voice chat runs on LiveKit (https://livekit.io): the audio never touches
 * this server. All Laravel does is decide who may talk in which game and
 * sign them a short-lived access token (a JWT, HS256, with LiveKit's
 * "video" grant).
 */
class LiveKit
{
    /** How long a voice token stays valid for joining. */
    public const TOKEN_TTL_SECONDS = 6 * 60 * 60;

    public static function enabled(): bool
    {
        return filled(config('services.livekit.url'))
            && filled(config('services.livekit.key'))
            && filled(config('services.livekit.secret'));
    }

    public static function url(): string
    {
        return (string) config('services.livekit.url');
    }

    public static function roomFor(Game $game): string
    {
        return 'game-'.$game->id;
    }

    /**
     * A token to join the game's voice room: speak and listen, nothing else.
     */
    public static function tokenFor(User $user, Game $game): string
    {
        $now = time();

        return self::sign([
            'iss' => (string) config('services.livekit.key'),
            'sub' => (string) $user->id,
            'name' => $user->codename,
            'nbf' => $now,
            'exp' => $now + self::TOKEN_TTL_SECONDS,
            'video' => [
                'room' => self::roomFor($game),
                'roomJoin' => true,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => false,
                'canPublishSources' => ['microphone'],
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private static function sign(array $claims): string
    {
        $segments = [
            self::base64Url((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT'])),
            self::base64Url((string) json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
        ];
        $segments[] = self::base64Url(hash_hmac('sha256', implode('.', $segments), (string) config('services.livekit.secret'), true));

        return implode('.', $segments);
    }

    private static function base64Url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
