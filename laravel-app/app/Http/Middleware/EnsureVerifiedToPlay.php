<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Playing needs a confirmed email address (config app.require_verified_email,
 * REQUIRE_EMAIL_VERIFICATION). The web app is sent to the "Verify your
 * email" page; the mobile app gets a 409 it shows its own screen for.
 */
class EnsureVerifiedToPlay
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! config('app.require_verified_email') || ! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => __('Verify your email address to play.'),
                'code' => 'email_unverified',
            ], 409);
        }

        return redirect()->route('verification.notice');
    }
}
