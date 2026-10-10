<?php

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
