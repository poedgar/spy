<?php

namespace App\Support;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Checks a Firebase Authentication ID token the way Firebase documents:
 * RS256-signed by one of Google's published keys, issued for this project,
 * not expired, with a subject. Only Google sign-ins are accepted.
 *
 * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
class FirebaseIdToken
{
    public const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

    public static function enabled(): bool
    {
        return filled(config('services.firebase.project_id'));
    }

    /**
     * @return array{uid: string, email: string, email_verified: bool, name: string|null}
     *
     * @throws ValidationException
     */
    public static function verify(string $token): array
    {
        $project = (string) config('services.firebase.project_id');

        try {
            $keys = array_map(fn (string $cert) => new Key($cert, 'RS256'), self::certificates());
            $claims = (array) JWT::decode($token, $keys);
        } catch (Throwable) {
            throw self::invalid();
        }

        $provider = (array) ($claims['firebase'] ?? []);

        if (($claims['aud'] ?? null) !== $project
            || ($claims['iss'] ?? null) !== "https://securetoken.google.com/{$project}"
            || ! is_string($claims['sub'] ?? null) || $claims['sub'] === ''
            || ($claims['auth_time'] ?? PHP_INT_MAX) > time() + 60
            || ($provider['sign_in_provider'] ?? null) !== 'google.com'
            || ! is_string($claims['email'] ?? null)) {
            throw self::invalid();
        }

        return [
            'uid' => $claims['sub'],
            'email' => mb_strtolower($claims['email']),
            'email_verified' => ($claims['email_verified'] ?? false) === true,
            'name' => is_string($claims['name'] ?? null) ? $claims['name'] : null,
        ];
    }

    /**
     * Google's current signing certificates, by key id, cached as long as
     * Google says they may be.
     *
     * @return array<string, string>
     */
    private static function certificates(): array
    {
        $cached = Cache::get('firebase:certs');

        if (is_array($cached)) {
            return $cached;
        }

        $response = Http::timeout(5)->get(self::CERTS_URL)->throw();
        $certs = (array) $response->json();
        preg_match('/max-age=(\d+)/', (string) $response->header('Cache-Control'), $match);
        Cache::put('firebase:certs', $certs, now()->addSeconds(max(60, (int) ($match[1] ?? 3600))));

        return $certs;
    }

    private static function invalid(): ValidationException
    {
        return ValidationException::withMessages(['id_token' => [__('Google sign-in failed. Please try again.')]]);
    }
}
