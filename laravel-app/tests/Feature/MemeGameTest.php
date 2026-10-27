<?php

use App\Models\GamePlayer;
use App\Models\Prompt;
use App\Models\User;
use App\Support\MemeData;
use Laravel\Sanctum\Sanctum;

test('creating a Meme It game needs no language, and gets a suggested name', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/meme', ['max_players' => 5])
        ->assertCreated()
        ->assertJsonPath('game_type', 'meme')
        ->assertJsonPath('phrase_language', null)
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Meme Lab:'));
    $this->postJson('/api/v1/games/meme', ['max_players' => 2])->assertJsonValidationErrors('max_players');

    $this->getJson('/api/v1/games/meme')->assertOk()->assertJsonCount(1, 'games');
});

test('the shipped pictures all exist and carry a credit and a source', function () {
    $memes = Prompt::where('game_type', 'meme')->get();

    expect($memes)->toHaveCount(count(MemeData::MEMES))
        ->and($memes->every(fn (Prompt $meme) => is_file(public_path($meme->image)) && filled($meme->credit) && str_starts_with((string) $meme->source_url, 'https://commons.wikimedia.org/')))->toBeTrue();
});

test('everyone captions the same picture, votes without names, and the best meme wins', function () {
    [$game, $host, [$a, $b, $c]] = memeGame(3);
    Prompt::where('game_type', 'meme')->where('image', '!=', MemeData::MEMES[0][0])->delete();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/start")->assertOk()
        ->assertJsonPath('finish.prompt', MemeData::MEMES[0][1])
        ->assertJsonPath('finish.image_url', asset(MemeData::MEMES[0][0]))
        ->assertJsonPath('finish.credit', MemeData::MEMES[0][2])
        ->assertJsonPath('finish.source_url', MemeData::MEMES[0][3]);

    foreach ([[$a, 'when the wifi drops'], [$b, 'monday morning'], [$c, 'me at 3am']] as [$user, $caption]) {
        Sanctum::actingAs($user);
        $this->postJson("/api/v1/games/{$game->code}/finish/answer", ['ending' => $caption])->assertOk();
    }

    $round = $game->currentFinishRound()->firstOrFail();
    $position = fn (User $author) => (int) array_search($author->id, $round->fresh()->answer_order, true);

    Sanctum::actingAs($a);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($a)])->assertUnprocessable();
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($b)])->assertOk();
    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($b)])->assertOk();
    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/finish/vote", ['answer' => $position($a)])->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('finish.result.winner_user_ids', [$b->id]);

    expect(GamePlayer::where('user_id', $b->id)->value('score'))->toBe(1);

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/finish/start")->assertOk()
        ->assertJsonPath('history.0.image_url', asset(MemeData::MEMES[0][0]))
        ->assertJsonPath('history.0.best_answer', 'monday morning');
});

test('admins add pictures by link with a credit; links must be https and not repeat', function () {
    $this->actingAs(User::factory()->create(['is_admin' => true]));

    $this->post(route('admin.prompts.store'), [
        'game' => 'meme',
        'text' => 'A cat in a hat',
        'image' => 'https://upload.wikimedia.org/cat-hat.jpg',
        'credit' => 'Jane Doe, CC BY 4.0',
        'source_url' => 'https://commons.wikimedia.org/wiki/File:Cat_hat.jpg',
        'language' => 'en',
    ])->assertSessionHasNoErrors();

    $meme = Prompt::where('image', 'https://upload.wikimedia.org/cat-hat.jpg')->sole();
    expect($meme->language)->toBeNull()->and($meme->credit)->toBe('Jane Doe, CC BY 4.0')->and($meme->imageUrl())->toBe('https://upload.wikimedia.org/cat-hat.jpg');

    $this->post(route('admin.prompts.store'), ['game' => 'meme', 'text' => 'Again', 'image' => 'https://upload.wikimedia.org/cat-hat.jpg'])->assertSessionHasErrors('image');
    $this->post(route('admin.prompts.store'), ['game' => 'meme', 'text' => 'Plain http', 'image' => 'http://example.com/a.jpg'])->assertSessionHasErrors('image');
    $this->post(route('admin.prompts.store'), ['game' => 'meme', 'text' => 'No picture'])->assertSessionHasErrors('image');
    // Phrases still need a language, and never keep a picture.
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'text' => 'Once upon…'])->assertSessionHasErrors('language');
    $this->post(route('admin.prompts.store'), ['game' => 'finish', 'language' => 'en', 'text' => 'Once upon…', 'image' => 'https://x.test/a.jpg'])->assertSessionHasNoErrors();
    expect(Prompt::where('text', 'Once upon…')->sole()->image)->toBeNull();

    $this->get(route('admin.prompts.index', ['game' => 'meme']))->assertInertia(fn ($page) => $page
        ->component('admin/Prompts')
        ->where('counts.meme.total', count(MemeData::MEMES) + 1));
});

test('the web pages render and the web form creates a game', function () {
    [$game, $host] = memeGame(3);

    $this->actingAs($host)->get(route('games.show', $game))->assertInertia(fn ($page) => $page->component('games/FinishLobby'));
    $this->get(route('games.meme'))->assertInertia(fn ($page) => $page->component('games/Meme'));
    $this->post(route('meme.store'), ['title' => 'Caption night', 'max_players' => 4])->assertRedirect();
    $this->assertDatabaseHas('games', ['title' => 'Caption night', 'game_type' => 'meme']);
});
