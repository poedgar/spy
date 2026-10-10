<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

test('the realtime check explains a broadcaster that drops everything', function () {
    config(['broadcasting.default' => 'null']);

    $this->artisan('app:check-realtime')
        ->expectsOutputToContain('Set BROADCAST_CONNECTION=pusher')
        ->assertFailed();
});

test('the realtime check reports Pusher settings without printing the secret', function () {
    config(['broadcasting.default' => 'pusher', 'broadcasting.connections.pusher.secret' => 'top-secret-value']);

    $this->artisan('app:check-realtime')
        ->doesntExpectOutputToContain('top-secret-value')
        ->expectsOutputToContain('PUSHER_APP_SECRET: set');
});

test('the realtime check shows a queue nobody is working through, and why jobs failed', function () {
    config(['broadcasting.default' => 'null', 'queue.default' => 'database']);
    DB::table('jobs')->insert([
        'queue' => 'default', 'payload' => '{}', 'attempts' => 0,
        'available_at' => now()->subHour()->timestamp, 'created_at' => now()->subHour()->timestamp,
    ]);
    DB::table('failed_jobs')->insert([
        'uuid' => (string) Str::uuid(), 'connection' => 'database', 'queue' => 'default', 'payload' => '{}',
        'exception' => "RuntimeException: Pusher said no\n#0 stack", 'failed_at' => now(),
    ]);

    $this->artisan('app:check-realtime')
        ->expectsOutputToContain('Jobs waiting: 1 (oldest waiting 1 hour')
        ->expectsOutputToContain('Jobs failed in the last day: 1')
        ->expectsOutputToContain('RuntimeException: Pusher said no');
});
