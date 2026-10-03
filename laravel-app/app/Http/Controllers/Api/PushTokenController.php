<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PushTokenController extends Controller
{
    public function store(Request $request): Response
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255', 'regex:/^Expo(nent)?PushToken\[.+\]$/'],
            'platform' => ['required', 'in:ios,android'],
        ]);

        // Upsert on the device token: a shared device that signs in as a
        // different account takes the token over rather than duplicating it.
        PushToken::updateOrCreate(['token' => $data['token']], [
            'user_id' => $request->user()->id,
            'personal_access_token_id' => $request->user()->currentAccessToken()->id,
            'platform' => $data['platform'],
        ]);

        return response()->noContent();
    }

    public function destroy(Request $request, string $token): Response
    {
        $request->user()->pushTokens()->where('token', $token)->delete();

        return response()->noContent();
    }
}
