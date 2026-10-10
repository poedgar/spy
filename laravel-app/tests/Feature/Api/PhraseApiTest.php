<?php

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\Locale;
use App\Enums\PhraseEnding;
use App\Events\RoundStarted;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\PhraseCatalog;
use App\Support\PhraseData;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

test('creating a phrase game sets its type and language', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/phrase', ['title' => 'Word play', 'phrase_language' => 'uk', 'max_players' => 6])
        ->assertCreated()
        ->assertJsonPath('game_type', 'phrase')
        ->assertJsonPath('phrase_language', 'uk')
        ->assertJsonPath('max_allowed_players', 10)
        ->assertJsonPath('phrase', null);

    $this->postJson('/api/v1/games/phrase', ['title' => 'Too big', 'phrase_language' => 'en', 'max_players' => 11])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('max_players');
});

test('the phrase home lists only phrase games', function () {
    [$game, $host] = phraseGame(3);
    GamePlayer::factory()->create(['user_id' => $host->id]); // a spy game
    Sanctum::actingAs($host);

    $this->getJson('/api/v1/games/phrase')
        ->assertOk()
        ->assertJsonCount(1, 'games')
        ->assertJsonPath('games.0.code', $game->code);
});

test('dealing gives every player a different word of a long enough phrase', function () {
    Event::fake([RoundStarted::class]);
    [$game, $host, $players] = phraseGame(7);

    $round = dealPhrase($game, $host);
    $words = $round->words();

    expect($game->fresh()->status)->toBe(GameStatus::Active)
        ->and(count($words))->toBeGreaterThanOrEqual(7)
        ->and(array_values(array_unique($round->assignments)))->toHaveCount(7)
        ->and($round->turn_order)->toHaveCount(7);

    Event::assertDispatched(RoundStarted::class, fn (RoundStarted $event) => $event->game->is($game) && $event->number === 1);

    foreach ($players as $player) {
        Sanctum::actingAs($player);
        $response = $this->getJson("/api/v1/games/{$game->code}")
            ->assertOk()
            ->assertJsonPath('phrase.my_word', $round->wordOf($player->id))
            ->assertJsonPath('phrase.my_position', $round->positionOf($player->id) + 1)
            ->assertJsonPath('phrase.word_count', count($words))
            ->assertJsonPath('phrase.result', null);

        // Nobody can read the whole phrase while it is in play.
        expect($response->getContent())->not->toContain(json_encode($round->text()));
    }
});

test('a deal needs three players and only the host can start it', function () {
    [$game, $host, $players] = phraseGame(2);
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertUnprocessable();

    [$game, , $players] = phraseGame(3);
    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/start")->assertForbidden();
});

test('the turn passes from the asker around the table, then to the next question round', function () {
    [$game, $host, $players] = phraseGame(3);
    $round = dealPhrase($game, $host);
    $order = $round->turn_order;
    $byId = collect($players)->keyBy('id');

    $notAsker = $byId->first(fn (User $user) => $user->id !== $order[0] && ! $user->is($host));
    if ($notAsker) {
        Sanctum::actingAs($notAsker);
        $this->postJson("/api/v1/games/{$game->code}/phrase/turn")->assertUnprocessable();
    }

    foreach ([1, 2] as $step) {
        Sanctum::actingAs($byId[$order[$step - 1]]);
        $this->postJson("/api/v1/games/{$game->code}/phrase/turn")
            ->assertOk()
            ->assertJsonPath('phrase.asker_user_id', $order[$step])
            ->assertJsonPath('phrase.question_round', 1);
    }

    // The host can always move a stalled turn along.
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/phrase/turn")
        ->assertOk()
        ->assertJsonPath('phrase.asker_user_id', $order[0])
        ->assertJsonPath('phrase.question_round', 2);
});

test('a wrong guess costs a point and play goes on', function () {
    [$game, $host, $players] = phraseGame(3);
    dealPhrase($game, $host);

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => 'definitely not the phrase'])
        ->assertOk()
        ->assertJsonPath('correct', false)
        ->assertJsonPath('game.status', 'active')
        ->assertJsonPath('game.phrase.guesses.0.correct', false);

    expect(GamePlayer::where('user_id', $players[1]->id)->value('score'))->toBe(-1);
});

test('the first right guess wins, loosely matched, and reveals everything', function () {
    [$game, $host, $players] = phraseGame(3);
    $round = dealPhrase($game, $host);
    $sloppy = mb_strtoupper(str_replace(["'", ','], ['’', ''], $round->text())).'!!';

    Sanctum::actingAs($players[2]);
    $response = $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => $sloppy])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('game.status', 'completed')
        ->assertJsonPath('game.phrase.result.ending', 'guessed')
        ->assertJsonPath('game.phrase.result.winner_user_id', $players[2]->id)
        ->assertJsonPath('game.phrase.result.phrase', $round->text());

    $dealt = collect($response->json('game.phrase.result.words'))->whereNotNull('user_id');
    expect($dealt)->toHaveCount(3)
        ->and(GamePlayer::where('user_id', $players[2]->id)->value('score'))->toBe(3);

    $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => $round->text()])->assertUnprocessable();
});

test('the next deal avoids phrases this game has already played and keeps scores', function () {
    [$game, $host, $players] = phraseGame(3);
    $first = dealPhrase($game, $host);
    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => $first->text()])->assertOk();

    $second = dealPhrase($game, $host);

    expect($second->number)->toBe(2)
        ->and($second->phrase_id)->not->toBe($first->phrase_id)
        ->and(GamePlayer::where('user_id', $players[1]->id)->value('score'))->toBe(3);
});

test('back to recruiting abandons the deal without points', function () {
    [$game, $host] = phraseGame(3);
    $round = dealPhrase($game, $host);

    $this->postJson("/api/v1/games/{$game->code}/reset")
        ->assertOk()
        ->assertJsonPath('status', 'recruiting')
        ->assertJsonPath('phrase', null);

    expect($round->fresh()->ending)->toBe(PhraseEnding::Abandoned);
});

test('spy actions are refused in a phrase game and phrase actions in a spy game', function () {
    [$game, $host] = phraseGame(3);
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/start")->assertUnprocessable()->assertJsonValidationErrors('game');

    $spy = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $spy->id, 'user_id' => $host->id, 'is_host' => true]);
    $this->postJson("/api/v1/games/{$spy->code}/phrase/start")->assertUnprocessable()->assertJsonValidationErrors('game');
});

test('every phrase in both pools can be dealt and matched', function (string $language) {
    $locale = Locale::from($language);

    foreach (PhraseData::PHRASES[$language] as $phrase) {
        $words = PhraseCatalog::words($phrase['text']);
        expect(count($words))->toBeGreaterThanOrEqual(3)
            ->and(PhraseCatalog::matches($locale, $phrase['id'], $phrase['text']))->toBeTrue();
    }

    expect(PhraseCatalog::longest($locale))->toBeGreaterThanOrEqual(GameType::Phrase->maxPlayers())
        ->and(collect(PhraseData::PHRASES[$language])->pluck('id')->duplicates())->toBeEmpty();
})->with(['en', 'uk']);

test('the web lobby renders the phrase page for phrase games', function () {
    [$game, $host] = phraseGame(3);

    $this->actingAs($host)->get(route('games.show', $game))
        ->assertInertia(fn ($page) => $page->component('games/PhraseLobby')->where('game.game_type', 'phrase'));
});
