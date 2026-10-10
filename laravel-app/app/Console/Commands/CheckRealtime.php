<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Broadcast;
use Throwable;

/**
 * Explains why live updates may not reach browsers and phones: which
 * broadcaster is active, whether Pusher is configured, and whether a test
 * broadcast actually goes out. Secrets are never printed.
 */
class CheckRealtime extends Command
{
    protected $signature = 'app:check-realtime';

    protected $description = 'Check the broadcasting setup and send a test broadcast';

    public function handle(): int
    {
        $driver = (string) config('broadcasting.default');
        $this->line("Broadcaster (BROADCAST_CONNECTION): <info>{$driver}</info>");
        $this->line('Queue (QUEUE_CONNECTION): <info>'.config('queue.default').'</info> — live notifications are queued, so a worker must run');

        if ($driver !== 'pusher') {
            $this->error("Broadcasts go to \"{$driver}\", not Pusher, so nothing is delivered live. Set BROADCAST_CONNECTION=pusher.");

            return self::FAILURE;
        }

        $pusher = (array) config('broadcasting.connections.pusher');
        $key = (string) ($pusher['key'] ?? '');
        $this->line('PUSHER_APP_ID: '.(filled($pusher['app_id'] ?? null) ? '<info>set</info>' : '<error>missing</error>'));
        $this->line('PUSHER_APP_KEY: '.($key !== '' ? '<info>'.substr($key, 0, 6).'…</info> (must match the front end\'s VITE_PUSHER_APP_KEY)' : '<error>missing</error>'));
        $this->line('PUSHER_APP_SECRET: '.(filled($pusher['secret'] ?? null) ? '<info>set</info>' : '<error>missing</error>'));
        $this->line('PUSHER_APP_CLUSTER: <info>'.($pusher['options']['cluster'] ?? '(none)').'</info>');

        try {
            Broadcast::connection()->broadcast(['diagnostics'], 'diagnostics.ping', ['at' => now()->toIso8601String()]);
        } catch (Throwable $e) {
            $this->error('The test broadcast failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('A test broadcast reached Pusher. If browsers still miss updates, check that the key above matches the front end and that a queue worker is running.');

        return self::SUCCESS;
    }
}
