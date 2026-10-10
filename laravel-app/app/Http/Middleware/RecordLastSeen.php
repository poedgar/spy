<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Notes when a signed-in user was last active, at most once a minute.
 * Checked after the request so API token guards have resolved the user.
 */
class RecordLastSeen
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if ($user instanceof User && ($user->last_seen_at === null || $user->last_seen_at->lt(now()->subMinute()))) {
            // A query rather than save(): no updated_at bump, no model events.
            User::whereKey($user->id)->update(['last_seen_at' => now()]);
        }

        return $response;
    }
}
