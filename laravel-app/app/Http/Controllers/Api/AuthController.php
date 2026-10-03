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
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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

        return $this->issueToken($user, $credentials['device_name']);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    protected function issueToken(User $user, string $deviceName): JsonResponse
    {
        Auth::setUser($user);

        return response()->json([
            'token' => $user->createToken($deviceName)->plainTextToken,
            'user' => UserResource::make($user),
        ]);
    }
}
