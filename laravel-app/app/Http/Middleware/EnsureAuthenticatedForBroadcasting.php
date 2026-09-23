<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAuthenticatedForBroadcasting
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->path() === 'broadcasting/auth' && ! auth()->check()) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
