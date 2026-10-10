<?php

use App\Exceptions\GameRuleException;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordLastSeen;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\ThrottleRegistration;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['middleware' => ['web', 'auth']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The locale cookie is read before cookies are decrypted (see SetLocale).
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'locale']);

        $middleware->prepend(SetLocale::class);

        $middleware->web(append: [
            SetLocale::class,
            ThrottleRegistration::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            RecordLastSeen::class,
        ]);

        $middleware->api(append: [
            SetLocale::class,
            RecordLastSeen::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(GameRuleException::class);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
