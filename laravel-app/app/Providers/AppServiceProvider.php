<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
        $this->configureEmailVerification();

        // Site administration (app:make-admin grants it).
        Gate::define('admin', fn (User $user) => $user->is_admin);
    }

    /**
     * Account creation, shared by the web form and the mobile API. Off in
     * local development, where the E2E suites sign up many users at once.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('register', fn (Request $request) => app()->isLocal()
            ? Limit::none()
            : Limit::perMinute(5)->by($request->ip()));

        // Invite codes are short; this stops anyone walking the code space
        // with join attempts (now that a join can also create a request).
        // Invitations push and email someone else, so they are capped per host.
        RateLimiter::for('invite', fn (Request $request) => [
            Limit::perMinute(10)->by('minute:'.$request->user()?->id),
            Limit::perHour(60)->by('hour:'.$request->user()?->id),
        ]);

        RateLimiter::for('join', fn (Request $request) => Limit::perMinute(20)->by($request->user()?->id ?: $request->ip()));

        // Lobby chat: a lively conversation, not a flood.
        RateLimiter::for('chat', fn (Request $request) => Limit::perMinute(20)->by('chat:'.$request->user()?->id));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        JsonResource::withoutWrapping();

        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Verification emails link to a signed route that needs no login, so
     * the link works from a phone's mail app as well as the web.
     */
    protected function configureEmailVerification(): void
    {
        VerifyEmail::createUrlUsing(fn (User $notifiable) => URL::temporarySignedRoute(
            'email.verify.link',
            now()->addMinutes((int) config('auth.verification.expire', 60)),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())],
        ));
    }
}
