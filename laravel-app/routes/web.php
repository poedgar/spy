<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('games/{game}', [GameController::class, 'show'])->name('games.show');
    Route::post('games', [GameController::class, 'store'])->name('games.store');
    Route::post('games/{code}/join', [GameController::class, 'join'])->name('games.join');
});

require __DIR__.'/settings.php';
