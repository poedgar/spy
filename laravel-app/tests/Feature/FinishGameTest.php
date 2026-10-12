<?php

use App\Enums\GameStatus;
use App\Models\FinishRound;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Prompt;
use App\Models\User;
use App\Notifications\RoundEnded;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

function startFinish(array $game): FinishRound
{
    Sanctum::actingAs($game[1]);
    test()->postJson("/api/v1/games/{$game[0]->code}/finish/start")->assertOk();

    return $game[0]->currentFinishRound()->firstOrFail();
}

function writeEnding(array $game, User $user, string $ending)
{
    Sanctum::actingAs($user);

    return test()->postJson("/api/v1/games/{$game[0]->code}/finish/answer", ['ending' => $ending]);
}

/** Where $author's ending sits in the voting list. */
function positionOf(FinishRound $round, User $author): int
{
    return (int) array_search($author->id, $round->fresh()->answer_order, true);
}

test('creating a Finish the Phrase game, with a suggested name when none is given', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/finish', ['max_players' => 6, 'phrase_language' => 'uk'])
        ->assertCreated()
        ->assertJsonPath('game_type', 'finish')
        ->assertJsonPath('phrase_language', 'uk')
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Wit Night:'));
    $this->postJson('/api/v1/games/finish', ['max_players' => 2, 'phrase_language' => 'en'])->assertJsonValidationErrors('max_players');
    $this->postJson('/api/v1/games/finish', ['max_players' => 4])->assertJsonValidationErrors('phrase_language');
});

test('a round needs three players and deals a beginning in the game\'s language that it has not had', function () {
    $game = finishGame(2, 'uk');
    Sanctum::actingAs($game[1]);
    $this->postJson("/api/v1/games/{$game[0]->code}/finish/start")->assertUnprocessable();

    GamePlayer::factory()->create(['game_id' => $game[0]->id, 'user_id' => User::factory()]);
    [$used, $fresh] = Prompt::where('language', 'uk')->take(2)->get();
    Prompt::where('language', 'uk')->whereNotIn('id', [$used->id, $fresh->id])->delete();
    $game[0]->finishRounds()->create(['number' => 1, 'prompt_id' => $used->id, 'text' => $used->text, 'started_at' => now(), 'ended_at' => now()]);

    $this->postJson("/api/v1/games/{$game[0]->code}/finish/start")
        ->assertOk()
        ->assertJsonPath('status', 'active')
        ->assertJsonPath('finish.number', 2)
        ->assertJsonPath('finish.prompt', $fresh->text)
        ->assertJsonPath('finish.answers', null);
});

test('with no beginnings in the language, the host is told', function () {
    $game = finishGame(3);
    Prompt::where('language', 'en')->delete();
    Sanctum::actingAs($game[1]);

    $this->postJson("/api/v1/games/{$game[0]->code}/finish/start")
        ->assertUnprocessable()
        ->assertJsonPath('errors.game.0', 'There are no phrase beginnings in this language yet. An admin needs to add some.');
});

test('endings stay private while players write, and the vote opens when everyone has one', function () {
    [$game, $host, [$a, $b, $c]] = finishGame(3);
    $round = startFinish([$game, $host]);

    writeEnding([$game], $a, '  never,   obviously ')->assertOk()
        ->assertJsonPath('finish.my_answer', 'never, obviously')
        ->assertJsonPath('finish.answered_user_ids', [$a->id]);
    writeEnding([$game], $a, 'never at all')->assertOk()->assertJsonPath('finish.my_answer', 'never at all');
    writeEnding([$game], $b, '')->assertUnprocessable();
    writeEnding([$game], $b, str_repeat('x', 151))->assertUnprocessable();

    // Others see who has written, not what.
    Sanctum::actingAs($b);
    $this->getJson("/api/v1/games/{$game->code}")
        ->assertJsonPath('finish.my_answer', null)
        ->assertJsonPath('finish.answered_user_ids', [$a->id])
        ->assertJsonMissing(['text' => 'never at all']);

    writeEnding([$game], $b, 'a bus')->assertOk()->assertJsonPath('status', 'active');
    writeEnding([$game], $c, 'the cat')->assertOk()
        ->assertJsonPath('status', 'voting')
        ->assertJsonCount(3, 'finish.answers')
        ->assertJsonPath('finish.answers.0.user_id', null)
        ->assertJsonPath('finish.answers.0.votes', null);

    expect($round->fresh()->answer_order)->toEqualCanonicalizing([$a->id, $b->id, $c->id]);
    $mine = collect($this->getJson("/api/v1/games/{$game->code}")->json('finish.answers'))->firstWhere('mine', true);
    expect($mine['text'])->toBe('the cat');

    writeEnding([$game], $c, 'too late')->assertUnprocessable();
});

test('the host can open the vote early once there are two endings', function () {
    [$game, $host, [$a, $b]] = finishGame(4);
    startFinish([$game, $host]);

    writeEnding([$game], $a, 'one');
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/voting")->assertUnprocessable();

    writeEnding([$game], $b, 'two');
    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/voting")->assertForbidden();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/voting")->assertOk()
        ->assertJsonPath('status', 'voting')
        ->assertJsonCount(2, 'finish.answers');
});

test('players vote without names; the best ending wins and names show at the end', function () {
    Notification::fake();
    [$game, $host, [$a, $b, $c]] = finishGame(3);
    $round = startFinish([$game, $host]);
    writeEnding([$game], $a, 'ending A');
    writeEnding([$game], $b, 'ending B');
    writeEnding([$game], $c, 'ending C');

    Sanctum::actingAs($a);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $a)])->assertUnprocessable();
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => 9])->assertUnprocessable();
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $c)])->assertOk()
        ->assertJsonPath('finish.my_vote', positionOf($round, $c))
        ->assertJsonPath('finish.voted_user_ids', [$a->id]);

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $c)])->assertOk();
    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $a)])->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('finish.result.winner_user_ids', [$c->id])
        ->assertJsonPath('finish.answers.'.positionOf($round, $c).'.user_id', $c->id)
        ->assertJsonPath('finish.answers.'.positionOf($round, $c).'.votes', 2);

    expect(GamePlayer::where('user_id', $c->id)->value('score'))->toBe(1)
        ->and(GamePlayer::where('user_id', $a->id)->value('score'))->toBe(0);
    Notification::assertSentTo($a, RoundEnded::class);
    Notification::assertNotSentTo($c, RoundEnded::class);

    $this->postJson("/api/v1/games/{$game->code}/finish/start")->assertForbidden();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/start")->assertOk()
        ->assertJsonPath('finish.number', 2)
        ->assertJsonPath('history.0.best_answer', 'ending C');
});

test('the host can close the vote early; a tie rewards everyone tied', function () {
    [$game, $host, [$a, $b, $c, $d]] = finishGame(4);
    $round = startFinish([$game, $host]);
    writeEnding([$game], $b, 'B');
    writeEnding([$game], $c, 'C');
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/voting")->assertOk();

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $c)])->assertOk();
    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => positionOf($round, $b)])->assertOk();

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/close")->assertForbidden();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/close")->assertOk()
        ->assertJsonPath('finish.result.winner_user_ids', collect([$b->id, $c->id])->sort()->values()->all());
    $this->postJson("/api/v1/games/{$game->code}/finish/close")->assertUnprocessable();
});

test('back to recruiting abandons the round, and the web pages render', function () {
    [$game, $host] = finishGame(3);
    startFinish([$game, $host]);

    $this->postJson("/api/v1/games/{$game->code}/reset")->assertOk()->assertJsonPath('status', 'recruiting');
    expect($game->finishRounds()->first()->ending)->toBe(FinishRound::ENDING_ABANDONED)
        ->and($game->fresh()->status)->toBe(GameStatus::Recruiting);

    $this->actingAs($host)->get(route('games.show', $game))->assertInertia(fn ($page) => $page->component('games/FinishLobby'));
    $this->get(route('games.finish'))->assertInertia(fn ($page) => $page->component('games/Finish'));
});

test('the web form creates a game and plays a round', function () {
    $host = User::factory()->create();
    $this->actingAs($host)->post(route('finish.store'), ['title' => 'Friday wit', 'max_players' => 5, 'phrase_language' => 'en'])
        ->assertRedirect();
    $game = Game::where('host_id', $host->id)->sole();
    GamePlayer::factory()->count(2)->create(['game_id' => $game->id]);

    $this->post(route('finish.start', $game))->assertRedirect();
    $this->post(route('finish.answer', $game), ['ending' => 'my web ending'])->assertRedirect();
    expect($game->currentFinishRound()->firstOrFail()->answers)->toBe([$host->id => 'my web ending']);
});
