<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GameController;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
    Route::get('games/{game}', [GameController::class, 'show'])->name('games.show');
    Route::post('games', [GameController::class, 'store'])->name('games.store');
});

require __DIR__.'/settings.php';
