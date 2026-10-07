<?php

namespace App\Http\Controllers;

use App\Enums\Locale;
use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /**
     * Saves the language on the account when signed in, so it follows the
     * user to the mobile app and their push notifications; guests keep it
     * in the session.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate(['locale' => ['required', Rule::enum(Locale::class)]]);

        $request->user()?->update(['locale' => $validated['locale']]);
        $request->session()->put(SetLocale::SESSION_KEY, $validated['locale']);

        return back();
    }
}
