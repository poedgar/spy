<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * The link in the verification email. Its signature proves it came from
 * us, so it works in any browser — including the phone's, where the
 * player isn't logged in on the web.
 */
class EmailVerificationLinkController extends Controller
{
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::findOrFail($id);

        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        if ($request->user()?->is($user)) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Your email is verified. Have fun!')]);

            return redirect()->route('dashboard');
        }

        return redirect()->route('login')->with('status', __('Your email is verified. Log in to play — or go back to the app.'));
    }
}
