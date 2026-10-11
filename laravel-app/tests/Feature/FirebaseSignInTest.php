<?php

use App\Models\User;
use App\Support\FirebaseIdToken;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;

const FIREBASE_PROJECT = 'marvelousgames-test';
const FIREBASE_KID = 'test-key-1';

beforeEach(function () {
    config(['services.firebase.project_id' => FIREBASE_PROJECT]);

    // A key pair and certificate standing in for Google's signing keys.
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    $cert = openssl_csr_sign(openssl_csr_new(['commonName' => 'test'], $key), null, $key, 1);
    openssl_x509_export($cert, $certPem);
    openssl_pkey_export($key, $this->privateKey);

    Http::fake([FirebaseIdToken::CERTS_URL => Http::response([FIREBASE_KID => $certPem], 200, ['Cache-Control' => 'public, max-age=3600'])]);
});

/**
 * A Firebase ID token as Google would issue it, with overrides.
 *
 * @param  array<string, mixed>  $claims
 */
function googleIdToken(string $privateKey, array $claims = []): string
{
    $now = time();

    return JWT::encode([
        'iss' => 'https://securetoken.google.com/'.FIREBASE_PROJECT,
        'aud' => FIREBASE_PROJECT,
        'sub' => 'google-uid-123',
        'auth_time' => $now - 5,
        'iat' => $now - 5,
        'exp' => $now + 3600,
        'email' => 'Ada@Example.com',
        'email_verified' => true,
        'name' => 'Ada Lovelace',
        'firebase' => ['sign_in_provider' => 'google.com'],
        ...$claims,
    ], $privateKey, 'RS256', FIREBASE_KID);
}

test('a new Google user gets a verified account and is logged in on the web', function () {
    $this->postJson(route('auth.firebase'), ['id_token' => googleIdToken($this->privateKey)])
        ->assertOk()
        ->assertJsonPath('redirect', route('dashboard'));

    $user = User::sole();
    expect($user->email)->toBe('ada@example.com')
        ->and($user->name)->toBe('Ada Lovelace')
        ->and($user->firebase_uid)->toBe('google-uid-123')
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and($user->codename)->not->toBeEmpty();
    $this->assertAuthenticatedAs($user);
    $this->get(route('dashboard'))->assertOk();
});

test('an existing account with the same email is linked, and its password still works', function () {
    $existing = User::factory()->unverified()->create(['email' => 'ada@example.com']);

    $this->postJson(route('auth.firebase'), ['id_token' => googleIdToken($this->privateKey)])->assertOk();

    expect(User::count())->toBe(1)
        ->and($existing->fresh()->firebase_uid)->toBe('google-uid-123')
        ->and($existing->fresh()->hasVerifiedEmail())->toBeTrue();
    $this->assertAuthenticatedAs($existing);
});

test('the app gets a token, or the two-factor challenge when the account has 2FA', function () {
    $this->postJson('/api/v1/auth/firebase', ['id_token' => googleIdToken($this->privateKey), 'device_name' => 'Pixel'])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'codename']])
        ->assertJsonPath('user.must_verify_email', false);

    User::sole()->forceFill(['two_factor_secret' => encrypt('secret'), 'two_factor_confirmed_at' => now()])->save();

    $this->postJson('/api/v1/auth/firebase', ['id_token' => googleIdToken($this->privateKey), 'device_name' => 'Pixel'])
        ->assertOk()
        ->assertJsonPath('two_factor', true)
        ->assertJsonMissingPath('token');
});

test('on the web, a 2FA account goes to the code challenge, not straight in', function () {
    User::factory()->create([
        'email' => 'ada@example.com',
        'two_factor_secret' => encrypt('secret'),
        'two_factor_confirmed_at' => now(),
    ]);

    $this->postJson(route('auth.firebase'), ['id_token' => googleIdToken($this->privateKey)])
        ->assertOk()
        ->assertJsonPath('redirect', route('two-factor.login'))
        ->assertSessionHas('login.id');
    $this->assertGuest();
});

test('tokens that are forged, for another project, expired, or not from Google are refused', function (array $claims) {
    $this->postJson('/api/v1/auth/firebase', ['id_token' => googleIdToken($this->privateKey, $claims), 'device_name' => 'Pixel'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('id_token');

    expect(User::count())->toBe(0);
})->with([
    'another project' => [['aud' => 'someone-else']],
    'wrong issuer' => [['iss' => 'https://securetoken.google.com/someone-else']],
    'expired' => [['exp' => time() - 10]],
    'email and password, not Google' => [['firebase' => ['sign_in_provider' => 'password']]],
    'unverified Google email' => [['email_verified' => false]],
]);

test('a token signed with a different key is refused', function () {
    $other = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($other, $otherPem);

    $this->postJson('/api/v1/auth/firebase', ['id_token' => googleIdToken($otherPem), 'device_name' => 'Pixel'])
        ->assertJsonValidationErrors('id_token');
});

test('Google sign-in is off until Firebase is configured, and the uid stays private', function () {
    $this->postJson('/api/v1/auth/firebase', ['id_token' => googleIdToken($this->privateKey), 'device_name' => 'Pixel'])->assertOk();
    expect(User::sole()->toArray())->not->toHaveKey('firebase_uid');

    config(['services.firebase.project_id' => null]);
    $this->postJson('/api/v1/auth/firebase', ['id_token' => 'x', 'device_name' => 'Pixel'])->assertNotFound();
});
