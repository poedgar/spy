<?php

namespace App\Http\Controllers\Api;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\TwoFactorAuthenticationProvider;

class AuthController extends Controller
{
    public function register(Request $request, CreateNewUser $creator): JsonResponse
    {
        $request->validate(['device_name' => ['required', 'string', 'max:255']]);

        $user = $creator->create($request->only(['name', 'email', 'password', 'password_confirmation']));

        return $this->issueToken($user, (string) $request->input('device_name'))->setStatusCode(201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => [__('auth.failed')]]);
        }

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $challenge = Str::random(40);

            Cache::put($this->challengeKey($challenge), [
                'user_id' => $user->id,
                'device_name' => $credentials['device_name'],
            ], now()->addMinutes(5));

            return response()->json(['two_factor' => true, 'challenge' => $challenge]);
        }

        return $this->issueToken($user, $credentials['device_name']);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function twoFactor(Request $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string'],
            'code' => ['nullable', 'string', 'required_without:recovery_code'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $pending = Cache::get($this->challengeKey($data['challenge']));
        $user = $pending ? User::whereKey($pending['user_id'])->first() : null;

        if (! $user) {
            throw ValidationException::withMessages(['challenge' => [__('This sign-in attempt has expired. Please log in again.')]]);
        }

        if (! empty($data['recovery_code'])) {
            $valid = collect($user->recoveryCodes())
                ->contains(fn (string $code) => hash_equals($code, $data['recovery_code']));

            if ($valid) {
                $user->replaceRecoveryCode($data['recovery_code']);
            }
        } else {
            $valid = $provider->verify(
                Fortify::currentEncrypter()->decrypt($user->two_factor_secret),
                $data['code'],
            );
        }

        if (! $valid) {
            throw ValidationException::withMessages(['code' => [__('The provided two factor authentication code was invalid.')]]);
        }

        Cache::forget($this->challengeKey($data['challenge']));

        return $this->issueToken($user, $pending['device_name']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'string', 'email']]);

        // The broker's status is deliberately ignored so the response never
        // reveals whether an account exists for this email.
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => __('If that email is registered, a reset link is on its way.'),
        ]);
    }

    protected function issueToken(User $user, string $deviceName): JsonResponse
    {
        Auth::setUser($user);

        return response()->json([
            'token' => $user->createToken($deviceName)->plainTextToken,
            'user' => UserResource::make($user),
        ]);
    }

    private function challengeKey(string $challenge): string
    {
        return 'api-two-factor:'.$challenge;
    }
}
