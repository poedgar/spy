<?php

use App\Models\GamePlayer;
use App\Models\Prompt;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Support\NotificationPresenter;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

test('creating an Interpret the Phrase game, with a suggested name when none is given', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/meaning', ['max_players' => 5, 'phrase_language' => 'en'])
        ->assertCreated()
        ->assertJsonPath('game_type', 'meaning')
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Riddle Club:'));
    $this->postJson('/api/v1/games/meaning', ['max_players' => 11, 'phrase_language' => 'en'])->assertJsonValidationErrors('max_players');

    $this->getJson('/api/v1/games/meaning')->assertOk()->assertJsonCount(1, 'games');
    $this->getJson('/api/v1/games/finish')->assertOk()->assertJsonCount(0, 'games');
});

test('a round deals an idiom, never a Finish the Phrase beginning, and reveals its meaning at the end', function () {
    Notification::fake();
    [$game, $host, [$a, $b, $c]] = meaningGame(3, 'uk');
    Prompt::where('game_type', 'meaning')->where('language', 'uk')->where('text', '!=', 'Бити байдики')->delete();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/start")->assertOk()
        ->assertJsonPath('finish.prompt', 'Бити байдики')
        ->assertJsonPath('finish.result', null)
        ->assertJsonMissing(['meaning' => 'Ледарювати, нічого не робити.']);

    foreach ([[$a, 'відпочивати'], [$b, 'грати в байдики'], [$c, 'нічого не робити']] as [$user, $answer]) {
        Sanctum::actingAs($user);
        $this->postJson("/api/v1/games/{$game->code}/finish/answer", ['ending' => $answer])->assertOk();
    }

    $round = $game->currentFinishRound()->firstOrFail();
    $position = fn (User $author) => (int) array_search($author->id, $round->fresh()->answer_order, true);

    Sanctum::actingAs($a);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($c)])->assertOk();
    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($c)])->assertOk();
    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($a)])->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('finish.result.winner_user_ids', [$c->id])
        ->assertJsonPath('finish.result.meaning', 'Ледарювати, нічого не робити.');

    expect(GamePlayer::where('user_id', $c->id)->value('score'))->toBe(1);
    Notification::assertSentTo($a, RoundEnded::class, function (RoundEnded $notification) use ($a, $c) {
        $presented = NotificationPresenter::present($notification->toArray($a), 'en');

        return str_contains($presented['body'], $c->codename.' gave the best interpretation')
            && $presented['link'] !== '/games/spy';
    });
});

test('with no idioms in the language, the host is told', function () {
    [$game, $host] = meaningGame(3);
    Prompt::where('game_type', 'meaning')->where('language', 'en')->delete();
    Sanctum::actingAs($host);

    $this->postJson("/api/v1/games/{$game->code}/finish/start")
        ->assertUnprocessable()
        ->assertJsonPath('errors.game.0', 'There are no phrases for this game in this language yet. An admin needs to add some.');
});

test('the web pages render and the web form creates a game', function () {
    [$game, $host] = meaningGame(3);

    $this->actingAs($host)->get(route('games.show', $game))->assertInertia(fn ($page) => $page->component('games/FinishLobby'));
    $this->get(route('games.meaning'))->assertInertia(fn ($page) => $page->component('games/Meaning'));

    $this->post(route('meaning.store'), ['title' => 'Idiom hour', 'max_players' => 4, 'phrase_language' => 'en'])->assertRedirect();
    $this->assertDatabaseHas('games', ['title' => 'Idiom hour', 'game_type' => 'meaning']);
});
