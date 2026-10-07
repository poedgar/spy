<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fortify registers its own POST /register route with no hook for a rate
 * limiter, so this web-group middleware applies the "register" limiter to
 * that one route.
 */
class ThrottleRegistration extends ThrottleRequests
{
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = ''): Response
    {
        if (! $request->routeIs('register.store')) {
            return $next($request);
        }

        return parent::handle($request, $next, 'register');
    }
}
