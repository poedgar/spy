<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\InvitationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('games/{game}', [GameController::class, 'show'])->name('games.show');
    Route::post('games', [GameController::class, 'store'])->name('games.store');
    Route::post('games/{code}/join', [GameController::class, 'join'])->name('games.join');
    Route::get('games/{game}/invite', [InvitationController::class, 'index'])->name('invitations.index');
    Route::post('games/{game}/invitations', [InvitationController::class, 'store'])->name('invitations.store');
    Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
    Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
