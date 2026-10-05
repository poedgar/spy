<?php

namespace App\Support;

use Throwable;

class BestEffortBroadcast
{
    /**
     * The state change that triggered the event is already saved at this
     * point — a broadcast failure (e.g. Pusher unreachable, misconfigured, or
     * a network/TLS error) is a best-effort delivery problem, not a reason to
     * fail the whole request. Pusher's SDK only wraps API-level errors (bad
     * credentials, rate limits) in BroadcastException; raw connectivity
     * failures surface as GuzzleHttp exceptions instead, so this catches
     * broadly.
     */
    public static function dispatch(object $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
