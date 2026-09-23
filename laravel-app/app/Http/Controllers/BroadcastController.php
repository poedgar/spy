<?php

namespace App\Http\Controllers;

use Illuminate\Broadcasting\BroadcastController as BaseBroadcastController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BroadcastController extends BaseBroadcastController
{
    /**
     * Authenticate the request for channel access.
     */
    public function authenticate(Request $request): Response|RedirectResponse
    {
        // Require authentication for broadcast auth endpoint
        if (! auth()->check()) {
            return redirect()->route('login');
        }

        return parent::authenticate($request);
    }
}
