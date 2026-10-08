<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the request's language: the signed-in user's saved preference, then
 * a guest's choice from the session (web only), then the locale cookie, then
 * Accept-Language.
 *
 * It runs twice on web requests: globally, so even pages for unknown URLs
 * (which never reach the web group) render in the visitor's language from
 * the cookie, and again in the web/api groups once the session and user are
 * known. The web pass keeps the cookie in step with the chosen language.
 */
class SetLocale
{
    public const SESSION_KEY = 'locale';

    public const COOKIE = 'locale';

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolve($request);
        App::setLocale($locale->value);

        // Only the routed (group) pass knows the user and session's choice.
        $routed = $request->route() !== null;

        $response = $next($request);

        if ($routed && $request->hasSession() && $request->cookie(self::COOKIE) !== $locale->value) {
            $response->headers->setCookie(cookie()->forever(self::COOKIE, $locale->value, httpOnly: false));
        }

        return $response;
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

        $cookie = $request->cookie(self::COOKIE);

        return (is_string($cookie) ? Locale::tryFrom($cookie) : null)
            ?? Locale::fromHeader($request->header('Accept-Language'))
            ?? Locale::English;
    }
}
