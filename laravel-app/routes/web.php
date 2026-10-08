<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PhraseController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');
Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('locations', [LocationController::class, 'index'])->name('locations.index');
    Route::get('games/spy', [DashboardController::class, 'spy'])->name('games.spy');
    Route::get('games/phrase', [DashboardController::class, 'phrase'])->name('games.phrase');
    Route::post('games/phrase', [PhraseController::class, 'store'])->name('phrase.store');
    Route::get('games/{game}', [GameController::class, 'show'])->name('games.show');
    Route::post('games', [GameController::class, 'store'])->name('games.store');
    Route::post('games/{code}/join', [GameController::class, 'join'])->middleware('throttle:join')->name('games.join');
    Route::post('games/{game}/leave', [GameController::class, 'leave'])->name('games.leave');
    Route::post('games/{game}/ready', [GameController::class, 'ready'])->name('games.ready');
    Route::post('games/{game}/start', [GameController::class, 'start'])->name('games.start');
    Route::post('games/{game}/voting', [GameController::class, 'voting'])->name('games.voting');
    Route::post('games/{game}/votes', [GameController::class, 'vote'])->name('games.vote');
    Route::post('games/{game}/tally', [GameController::class, 'tally'])->name('games.tally');
    Route::post('games/{game}/guess', [GameController::class, 'guess'])->name('games.guess');
    Route::post('games/{game}/reset', [GameController::class, 'reset'])->name('games.reset');
    Route::post('games/{game}/phrase/start', [PhraseController::class, 'start'])->name('phrase.start');
    Route::post('games/{game}/phrase/turn', [PhraseController::class, 'turn'])->name('phrase.turn');
    Route::post('games/{game}/phrase/guess', [PhraseController::class, 'guess'])->name('phrase.guess');
    Route::post('games/{game}/settings', [LobbyController::class, 'settings'])->name('games.settings');
    Route::delete('games/{game}/players/{user}', [LobbyController::class, 'removePlayer'])->name('games.players.remove');
    Route::post('games/{game}/host', [LobbyController::class, 'transferHost'])->name('games.host');
    Route::post('games/{game}/join-requests', [LobbyController::class, 'requestToJoin'])->middleware('throttle:join')->name('join-requests.store');
    Route::delete('games/{game}/join-requests/mine', [LobbyController::class, 'cancelRequest'])->name('join-requests.cancel');
    Route::post('games/{game}/join-requests/{joinRequest}/approve', [LobbyController::class, 'approve'])->name('join-requests.approve');
    Route::post('games/{game}/join-requests/{joinRequest}/decline', [LobbyController::class, 'decline'])->name('join-requests.decline');
    Route::delete('games/{game}/invitations/{invitation}', [LobbyController::class, 'cancelInvitation'])->name('invitations.cancel');
    Route::get('games/{game}/invite', [InvitationController::class, 'index'])->name('invitations.index');
    Route::post('games/{game}/invitations', [InvitationController::class, 'store'])->name('invitations.store');
    Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
    Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
