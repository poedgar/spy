<?php

namespace App\Http\Controllers\Api;

use App\Enums\AgeTier;
use App\Http\Controllers\Controller;
use App\Support\LocationCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocationController extends Controller
{
    /**
     * The location guide. Public data, so it needs no game context: pass
     * ?tier= to get the pool a game of that age tier draws from.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['tier' => ['nullable', Rule::enum(AgeTier::class)]]);
        $tier = AgeTier::tryFrom($validated['tier'] ?? '') ?? AgeTier::Adults;

        return response()->json([
            'tier' => $tier,
            'categories' => LocationCatalog::categories(),
            'locations' => LocationCatalog::presentTier($tier),
        ]);
    }
}
