<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
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
}
