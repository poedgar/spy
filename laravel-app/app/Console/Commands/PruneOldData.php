<?php

namespace App\Console\Commands;

use App\Enums\InvitationStatus;
use App\Models\Game;
use App\Models\JoinRequest;
use Illuminate\Console\Command;
use Illuminate\Notifications\DatabaseNotification;

/**
 * Keeps the database from growing forever. Scheduled daily.
 */
class PruneOldData extends Command
{
    protected $signature = 'app:prune-old-data';

    protected $description = 'Delete old notifications, answered join requests and long-abandoned games';

    /** Games nobody has touched in this many days are deleted. */
    public const GAME_DAYS = 90;

    public function handle(): int
    {
        $notifications = DatabaseNotification::query()
            ->where(fn ($query) => $query
                ->where(fn ($read) => $read->whereNotNull('read_at')->where('created_at', '<', now()->subDays(60)))
                ->orWhere('created_at', '<', now()->subDays(180)))
            ->delete();

        $requests = JoinRequest::where('status', '!=', InvitationStatus::Pending)
            ->where('updated_at', '<', now()->subDays(30))
            ->delete();

        $games = Game::where('updated_at', '<', now()->subDays(self::GAME_DAYS))->delete();

        $this->info("Pruned {$notifications} notifications, {$requests} join requests and {$games} games.");

        return self::SUCCESS;
    }
}
