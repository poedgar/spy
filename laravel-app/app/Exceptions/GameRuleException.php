<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * A game rule was violated (full roster, stale invitation, ...). Renders the
 * way each client expects: a validation-shaped 422 for the JSON API, and a
 * flashed field error for the Inertia web app — so Actions can throw it
 * without knowing which client called them.
 */
class GameRuleException extends Exception
{
    public function __construct(
        public readonly string $field,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function render(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'message' => $this->getMessage(),
                'errors' => [$this->field => [$this->getMessage()]],
            ], 422);
        }

        return back()->withErrors([$this->field => $this->getMessage()]);
    }
}
