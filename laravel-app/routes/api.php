<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\PushTokenController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('auth/two-factor', [AuthController::class, 'twoFactor'])->middleware('throttle:6,1');
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me', [MeController::class, 'show']);
        Route::patch('me', [MeController::class, 'update']);
        Route::put('me/password', [MeController::class, 'updatePassword'])->middleware('throttle:6,1');
        Route::delete('me', [MeController::class, 'destroy']);
        Route::post('me/push-tokens', [PushTokenController::class, 'store']);
        Route::delete('me/push-tokens/{token}', [PushTokenController::class, 'destroy']);

        Route::get('games/spy', [GameController::class, 'spy']);
        Route::post('games', [GameController::class, 'store']);
        Route::get('games/{code}', [GameController::class, 'show']);
        Route::post('games/{code}/join', [GameController::class, 'join']);

        Route::get('games/{code}/invitable-users', [InvitationController::class, 'invitable']);
        Route::post('games/{code}/invitations', [InvitationController::class, 'store']);
        Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept']);
        Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline']);
    });
});

Broadcast::routes(['middleware' => ['auth:sanctum']]);
