<?php

namespace App\Support;

use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

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
     * Who is in the game's voice room right now, so a lobby can say
     * "2 in voice: …" before anyone joins. Asked of LiveKit at most every
     * few seconds per room; an outage just means an empty list.
     *
     * @return list<array{identity: string, name: string}>
     */
    public static function participants(Game $game): array
    {
        $room = self::roomFor($game);

        return Cache::remember("livekit:participants:{$room}", 10, function () use ($room): array {
            try {
                $now = time();
                $token = self::sign([
                    'iss' => (string) config('services.livekit.key'),
                    'nbf' => $now,
                    'exp' => $now + 60,
                    'video' => ['room' => $room, 'roomAdmin' => true],
                ]);
                // The same host serves the API over HTTP(S).
                $api = preg_replace('/^ws/', 'http', rtrim(self::url(), '/'));

                $participants = Http::withToken($token)->acceptJson()->asJson()->connectTimeout(2)->timeout(4)
                    ->post("{$api}/twirp/livekit.RoomService/ListParticipants", ['room' => $room])
                    ->throw()
                    ->json('participants', []);
            } catch (Throwable $e) {
                report($e);

                return [];
            }

            return array_values(array_map(
                fn (array $participant) => [
                    'identity' => (string) ($participant['identity'] ?? ''),
                    'name' => (string) ($participant['name'] ?? $participant['identity'] ?? ''),
                ],
                array_filter(
                    is_array($participants) ? $participants : [],
                    fn ($participant) => is_array($participant)
                        && ! in_array($participant['state'] ?? 'ACTIVE', ['DISCONNECTED', 3], true),
                ),
            ));
        });
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
