<?php

namespace App\Http\Controllers;

use App\Enums\GameType;
use App\Support\GameNameGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * A fresh random name for a new game (the create forms' dice button), in
 * the player's language. Shared by the web app and the mobile API.
 */
class GameNameController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['type' => ['required', Rule::enum(GameType::class)]]);

        return response()->json(['title' => GameNameGenerator::for(GameType::from($data['type']))]);
    }
}
