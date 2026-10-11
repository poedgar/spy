<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * The only way to make (or unmake) a site administrator.
 */
class MakeAdmin extends Command
{
    protected $signature = 'app:make-admin {email : The account to change} {--revoke : Take admin access away instead}';

    protected $description = 'Give an account access to the admin pages (or take it away with --revoke)';

    public function handle(): int
    {
        $user = User::where('email', mb_strtolower((string) $this->argument('email')))->first();

        if (! $user) {
            $this->error('No account uses that email.');

            return self::FAILURE;
        }

        $admin = ! $this->option('revoke');
        $user->forceFill(['is_admin' => $admin])->save();

        $this->info($admin
            ? "{$user->email} ({$user->codename}) is now an admin."
            : "{$user->email} ({$user->codename}) is no longer an admin.");

        return self::SUCCESS;
    }
}
