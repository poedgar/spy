<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the request's language: the signed-in user's saved preference, then
 * a guest's choice from the session (web only), then Accept-Language.
 */
class SetLocale
{
    public const SESSION_KEY = 'locale';

    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale($this->resolve($request)->value);

        return $next($request);
    }

    private function resolve(Request $request): Locale
    {
        $user = $request->is('api/*') ? $request->user('sanctum') : $request->user();

        if ($user) {
            return $user->locale;
        }

        if ($request->hasSession() && ($saved = Locale::tryFrom((string) $request->session()->get(self::SESSION_KEY)))) {
            return $saved;
        }

        return Locale::fromHeader($request->header('Accept-Language')) ?? Locale::English;
    }
}
