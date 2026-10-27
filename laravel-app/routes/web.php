<?php

use App\Http\Controllers\Admin\FaceController as AdminFaceController;
use App\Http\Controllers\Admin\FeedbackController as AdminFeedbackController;
use App\Http\Controllers\Admin\GameController as AdminGameController;
use App\Http\Controllers\Admin\LocationController as AdminLocationController;
use App\Http\Controllers\Admin\PhraseController as AdminPhraseController;
use App\Http\Controllers\Admin\PromptController as AdminPromptController;
use App\Http\Controllers\Admin\SongController as AdminSongController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailVerificationLinkController;
use App\Http\Controllers\EmotionController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\FinishController;
use App\Http\Controllers\FirebaseSignInController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GameNameController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PhraseController;
use App\Http\Controllers\SongController;
use App\Http\Controllers\VoiceController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');
Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth', 'can:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
    Route::get('games', [AdminGameController::class, 'index'])->name('games.index');
    Route::delete('games/abandoned', [AdminGameController::class, 'destroyAbandoned'])->name('games.destroy-abandoned');
    Route::delete('games/{game}', [AdminGameController::class, 'destroy'])->name('games.destroy');
    Route::get('locations', [AdminLocationController::class, 'index'])->name('locations.index');
    Route::post('locations', [AdminLocationController::class, 'store'])->name('locations.store');
    Route::put('locations/{location}', [AdminLocationController::class, 'update'])->name('locations.update');
    Route::delete('locations/{location}', [AdminLocationController::class, 'destroy'])->name('locations.destroy');
    Route::get('phrases', [AdminPhraseController::class, 'index'])->name('phrases.index');
    Route::post('phrases', [AdminPhraseController::class, 'store'])->name('phrases.store');
    Route::put('phrases/{phrase}', [AdminPhraseController::class, 'update'])->name('phrases.update');
    Route::delete('phrases/{phrase}', [AdminPhraseController::class, 'destroy'])->name('phrases.destroy');
    Route::get('songs', [AdminSongController::class, 'index'])->name('songs.index');
    Route::post('songs', [AdminSongController::class, 'store'])->name('songs.store');
    Route::put('songs/{song}', [AdminSongController::class, 'update'])->name('songs.update');
    Route::delete('songs/{song}', [AdminSongController::class, 'destroy'])->name('songs.destroy');
    Route::get('prompts', [AdminPromptController::class, 'index'])->name('prompts.index');
    Route::post('prompts', [AdminPromptController::class, 'store'])->name('prompts.store');
    Route::put('prompts/{prompt}', [AdminPromptController::class, 'update'])->name('prompts.update');
    Route::delete('prompts/{prompt}', [AdminPromptController::class, 'destroy'])->name('prompts.destroy');
    Route::get('faces', [AdminFaceController::class, 'index'])->name('faces.index');
    Route::put('faces/{face}', [AdminFaceController::class, 'update'])->name('faces.update');
    Route::get('feedback', [AdminFeedbackController::class, 'index'])->name('feedback.index');
    Route::put('feedback/{feedback}', [AdminFeedbackController::class, 'update'])->name('feedback.update');
    Route::delete('feedback/{feedback}', [AdminFeedbackController::class, 'destroy'])->name('feedback.destroy');
});

// The home page's idea / bug report form, open to guests too.
Route::post('feedback', [FeedbackController::class, 'store'])->name('feedback.store');

// "Continue with Google" (Firebase) from the login and register pages.
Route::post('auth/firebase', FirebaseSignInController::class)
    ->middleware(['guest', 'throttle:10,1'])
    ->name('auth.firebase');

// The link in the verification email: signed, so no login needed.
Route::get('verify-email/{id}/{hash}', EmailVerificationLinkController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('email.verify.link');

Route::middleware(['auth', 'verified.play'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('notifications/{notification}/open', [NotificationController::class, 'open'])->name('notifications.open');
    Route::get('game-name', GameNameController::class)->name('game-name');
    Route::get('games/spy', [DashboardController::class, 'spy'])->name('games.spy');
    Route::get('games/phrase', [DashboardController::class, 'phrase'])->name('games.phrase');
    Route::get('games/song', [DashboardController::class, 'song'])->name('games.song');
    Route::post('games/song', [SongController::class, 'store'])->name('song.store');
    Route::get('games/finish', [DashboardController::class, 'finish'])->name('games.finish');
    Route::post('games/finish', [FinishController::class, 'store'])->name('finish.store');
    Route::get('games/meaning', [DashboardController::class, 'meaning'])->name('games.meaning');
    Route::post('games/meaning', [FinishController::class, 'storeMeaning'])->name('meaning.store');
    Route::get('games/meme', [DashboardController::class, 'meme'])->name('games.meme');
    Route::post('games/meme', [FinishController::class, 'storeMeme'])->name('meme.store');
    Route::get('games/emotion', [DashboardController::class, 'emotion'])->name('games.emotion');
    Route::post('games/emotion', [EmotionController::class, 'store'])->name('emotion.store');
    Route::post('games/phrase', [PhraseController::class, 'store'])->name('phrase.store');
    Route::get('games/{code}', [GameController::class, 'show'])->name('games.show');
    Route::delete('games/{game}', [LobbyController::class, 'close'])->name('games.close');
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
    Route::post('games/{game}/phrase/reveal', [PhraseController::class, 'reveal'])->name('phrase.reveal');
    Route::post('games/{game}/phrase/guess', [PhraseController::class, 'guess'])->name('phrase.guess');
    Route::post('games/{game}/song/start', [SongController::class, 'start'])->name('song.start');
    Route::post('games/{game}/song/turn', [SongController::class, 'turn'])->name('song.turn');
    Route::post('games/{game}/song/vote', [SongController::class, 'vote'])->name('song.vote');
    Route::post('games/{game}/song/close', [SongController::class, 'close'])->name('song.close');
    Route::post('games/{game}/finish/start', [FinishController::class, 'start'])->name('finish.start');
    Route::post('games/{game}/finish/answer', [FinishController::class, 'answer'])->name('finish.answer');
    Route::post('games/{game}/finish/voting', [FinishController::class, 'voting'])->name('finish.voting');
    Route::post('games/{game}/finish/vote', [FinishController::class, 'vote'])->name('finish.vote');
    Route::post('games/{game}/finish/close', [FinishController::class, 'close'])->name('finish.close');
    Route::post('games/{game}/emotion/start', [EmotionController::class, 'start'])->name('emotion.start');
    Route::post('games/{game}/emotion/answer', [EmotionController::class, 'answer'])->name('emotion.answer');
    Route::post('games/{game}/emotion/reveal', [EmotionController::class, 'reveal'])->name('emotion.reveal');
    Route::post('games/{game}/settings', [LobbyController::class, 'settings'])->name('games.settings');
    Route::delete('games/{game}/players/{user}', [LobbyController::class, 'removePlayer'])->name('games.players.remove');
    Route::post('games/{game}/host', [LobbyController::class, 'transferHost'])->name('games.host');
    Route::post('games/{game}/join-requests', [LobbyController::class, 'requestToJoin'])->middleware('throttle:join')->name('join-requests.store');
    Route::delete('games/{game}/join-requests/mine', [LobbyController::class, 'cancelRequest'])->name('join-requests.cancel');
    Route::post('games/{game}/join-requests/{joinRequest}/approve', [LobbyController::class, 'approve'])->name('join-requests.approve');
    Route::post('games/{game}/join-requests/{joinRequest}/decline', [LobbyController::class, 'decline'])->name('join-requests.decline');
    Route::delete('games/{game}/invitations/{invitation}', [LobbyController::class, 'cancelInvitation'])->name('invitations.cancel');
    Route::get('games/{game}/invite', [InvitationController::class, 'index'])->name('invitations.index');
    Route::get('games/{game}/voice', [VoiceController::class, 'show'])->middleware('throttle:30,1')->name('games.voice');
    Route::get('games/{game}/voice/participants', [VoiceController::class, 'participants'])->name('games.voice.participants');
    Route::get('games/{game}/messages', [ChatController::class, 'index'])->name('games.messages');
    Route::post('games/{game}/messages', [ChatController::class, 'store'])->middleware('throttle:chat')->name('games.messages.store');
    Route::post('games/{game}/invitations', [InvitationController::class, 'store'])->middleware('throttle:invite')->name('invitations.store');
    Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
    Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline'])->name('invitations.decline');
});

require __DIR__.'/settings.php';
