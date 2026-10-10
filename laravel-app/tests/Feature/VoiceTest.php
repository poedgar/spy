<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\LiveKit;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    config(['services.livekit' => ['url' => 'wss://example.livekit.cloud', 'key' => 'APIkey123', 'secret' => 'shhh-secret']]);
    $this->game = Game::factory()->create();
    $this->player = User::factory()->create(['codename' => 'NIGHT_HAWK']);
    GamePlayer::factory()->create(['game_id' => $this->game->id, 'user_id' => $this->player->id]);
});

/**
 * @return array{0: array<string, mixed>, 1: array<string, mixed>, 2: string}
 */
function decodeJwt(string $jwt): array
{
    [$header, $claims, $signature] = explode('.', $jwt);
    $decode = fn (string $part) => json_decode(base64_decode(strtr($part, '-_', '+/')), true);

    return [$decode($header), $decode($claims), $signature];
}

test('a player gets a signed LiveKit token for their game only', function () {
    Sanctum::actingAs($this->player);

    $response = $this->getJson("/api/v1/games/{$this->game->code}/voice")
        ->assertOk()
        ->assertJsonPath('url', 'wss://example.livekit.cloud')
        ->assertJsonPath('room', "game-{$this->game->id}");

    $jwt = $response->json('token');
    [$header, $claims, $signature] = decodeJwt($jwt);
    [$h, $c] = explode('.', $jwt);
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$h}.{$c}", 'shhh-secret', true)), '+/', '-_'), '=');

    expect($header)->toBe(['alg' => 'HS256', 'typ' => 'JWT'])
        ->and($signature)->toBe($expected)
        ->and($claims['iss'])->toBe('APIkey123')
        ->and($claims['sub'])->toBe((string) $this->player->id)
        ->and($claims['name'])->toBe('NIGHT_HAWK')
        ->and($claims['exp'] - $claims['nbf'])->toBe(LiveKit::TOKEN_TTL_SECONDS)
        ->and($claims['video'])->toMatchArray([
            'room' => "game-{$this->game->id}",
            'roomJoin' => true,
            'canPublish' => true,
            'canSubscribe' => true,
            'canPublishSources' => ['microphone'],
        ]);
});

test('the web app gets the same token by game', function () {
    $this->actingAs($this->player)->getJson(route('games.voice', $this->game))
        ->assertOk()
        ->assertJsonPath('room', "game-{$this->game->id}");
});

test('only players of the game may join its voice room', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson("/api/v1/games/{$this->game->code}/voice")->assertForbidden();
});

test('voice chat is off until LiveKit is configured, and the lobby says so', function () {
    Sanctum::actingAs($this->player);
    $this->getJson("/api/v1/games/{$this->game->code}")->assertJsonPath('voice_enabled', true);

    config(['services.livekit.secret' => null]);

    $this->getJson("/api/v1/games/{$this->game->code}/voice")->assertNotFound();
    $this->getJson("/api/v1/games/{$this->game->code}")->assertJsonPath('voice_enabled', false);
});
