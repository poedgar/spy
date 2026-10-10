<?php

namespace App\Support;

use App\Models\PushToken;
use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

/**
 * Sends messages through Expo's push service, one per device, and prunes
 * tokens Expo reports as no longer registered.
 */
class ExpoPush
{
    private const URL = 'https://exp.host/--/api/v2/push/send';

    /** Expo accepts at most 100 messages per request. */
    private const BATCH_SIZE = 100;

    /**
     * @param  Collection<int, PushToken>  $tokens
     * @param  Closure(PushToken): array<string, mixed>  $message  the message for one device, without "to"
     */
    public static function send(Collection $tokens, Closure $message): void
    {
        foreach ($tokens->values()->chunk(self::BATCH_SIZE) as $batch) {
            $batch = $batch->values();

            // Short timeouts: this may run inside a player's request.
            $request = Http::acceptJson()->asJson()->connectTimeout(3)->timeout(5);

            if ($accessToken = config('services.expo.access_token')) {
                $request = $request->withToken($accessToken);
            }

            $messages = array_values($batch->map(fn (PushToken $token) => ['to' => $token->token, ...$message($token)])->all());

            // Tickets come back in the same order as the messages.
            $tickets = $request->post(self::URL, $messages)->throw()->json('data', []);

            foreach ($tickets as $index => $ticket) {
                if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                    $batch[$index]->delete();
                }
            }
        }
    }
}
