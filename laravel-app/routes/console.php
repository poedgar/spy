<?php

use Illuminate\Support\Facades\Schedule;

// Production needs the scheduler running: `php artisan schedule:work`, or
// a cron entry calling `php artisan schedule:run` every minute.
Schedule::command('app:prune-old-data')->daily();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
