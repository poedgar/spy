<?php

namespace App\Http\Controllers;

use App\Actions\Auth\SignInWithFirebase;
use App\Support\FirebaseIdToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * "Continue with Google" on the web: the browser signs in with Firebase and
 * hands over its ID token; this logs the matching account in (or sends it
 * to the two-factor challenge) and says where to go next.
 */
class FirebaseSignInController extends Controller
{
    public function __invoke(Request $request, SignInWithFirebase $signIn): JsonResponse
    {
        abort_unless(FirebaseIdToken::enabled(), 404);

        $data = $request->validate(['id_token' => ['required', 'string']]);
        $user = $signIn->handle($data['id_token']);

        if ($user->hasEnabledTwoFactorAuthentication()) {
            // What Fortify's own login does before its two-factor challenge.
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => true]);

            return response()->json(['redirect' => route('two-factor.login')]);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return response()->json(['redirect' => route('dashboard')]);
    }
}
