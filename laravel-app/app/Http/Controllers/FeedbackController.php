<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The home page's "send an idea or report a bug" form, open to guests too.
 */
class FeedbackController extends Controller
{
    public const MAX_LENGTH = 2000;

    /** Messages one visitor may send per ten minutes. */
    public const PER_TEN_MINUTES = 5;

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(Feedback::KINDS)],
            'message' => ['required', 'string', 'min:5', 'max:'.self::MAX_LENGTH],
            'email' => ['nullable', 'email', 'max:255'],
            // Left empty by people; bots fill in every field.
            'website' => ['prohibited'],
        ]);

        $user = $request->user();
        $key = 'feedback:'.($user !== null ? 'user:'.$user->id : 'ip:'.$request->ip());

        if (RateLimiter::tooManyAttempts($key, self::PER_TEN_MINUTES)) {
            throw ValidationException::withMessages(['message' => __('Too many messages. Try again in a few minutes.')]);
        }

        RateLimiter::hit($key, 600);

        Feedback::create([
            'kind' => $data['kind'],
            'message' => trim((string) $data['message']),
            'email' => $user === null && filled($data['email'] ?? null) ? (string) $data['email'] : null,
            'user_id' => $user?->id,
            'locale' => app()->getLocale(),
            'user_agent' => Str::limit((string) $request->userAgent(), 490, ''),
        ]);

        return back();
    }
}
