<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\PushTokenController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('auth/two-factor', [AuthController::class, 'twoFactor'])->middleware('throttle:6,1');
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me', [MeController::class, 'show']);
        Route::patch('me', [MeController::class, 'update']);
        Route::put('me/locale', [MeController::class, 'updateLocale']);
        Route::put('me/password', [MeController::class, 'updatePassword'])->middleware('throttle:6,1');
        Route::delete('me', [MeController::class, 'destroy']);
        Route::post('me/push-tokens', [PushTokenController::class, 'store']);
        Route::delete('me/push-tokens/{token}', [PushTokenController::class, 'destroy']);

        Route::get('games/spy', [GameController::class, 'spy']);
        Route::post('games', [GameController::class, 'store']);
        Route::get('games/{code}', [GameController::class, 'show']);
        Route::post('games/{code}/join', [GameController::class, 'join']);
        Route::post('games/{code}/leave', [GameController::class, 'leave']);
        Route::post('games/{code}/ready', [GameController::class, 'ready']);
        Route::post('games/{code}/start', [GameController::class, 'start']);
        Route::post('games/{code}/voting', [GameController::class, 'voting']);
        Route::post('games/{code}/votes', [GameController::class, 'vote']);
        Route::post('games/{code}/tally', [GameController::class, 'tally']);
        Route::post('games/{code}/guess', [GameController::class, 'guess']);
        Route::post('games/{code}/reset', [GameController::class, 'reset']);

        Route::get('locations', [LocationController::class, 'index']);

        Route::get('games/{code}/invitable-users', [InvitationController::class, 'invitable']);
        Route::post('games/{code}/invitations', [InvitationController::class, 'store']);
        Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept']);
        Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline']);
    });
});

Broadcast::routes(['middleware' => ['auth:sanctum']]);
