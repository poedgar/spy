<?php

namespace App\Console\Commands;

use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
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
        $queue = (string) config('queue.default');
        $this->line("Queue (QUEUE_CONNECTION): <info>{$queue}</info>".($queue === 'sync'
            ? ' — notifications go out during the request that sends them; no worker needed'
            : ' — live notifications are queued, so a worker must run'));
        $this->reportQueue();

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

    /**
     * Jobs waiting mean no worker is taking them; failed ones say why
     * deliveries broke.
     */
    private function reportQueue(): void
    {
        if (config('queue.default') !== 'database') {
            return;
        }

        $waiting = DB::table('jobs')->count();
        $oldest = DB::table('jobs')->min('created_at');
        $age = $oldest ? now()->setTimestamp((int) $oldest)->diffForHumans(['syntax' => CarbonInterface::DIFF_ABSOLUTE]) : null;
        $this->line("Jobs waiting: <info>{$waiting}</info>".($age ? " (oldest waiting {$age} — no worker is running if this keeps growing)" : ''));

        $failed = DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count();
        $this->line("Jobs failed in the last day: <info>{$failed}</info>");

        $latest = DB::table('failed_jobs')->latest('failed_at')->first(['failed_at', 'exception']);
        if ($latest) {
            $this->line('Latest failure ('.$latest->failed_at.'): '.strtok((string) $latest->exception, "\n"));
        }
    }
}
