<?php

use App\Enums\GameStatus;
use App\Models\EmotionRound;
use App\Models\Face;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Support\EmotionCatalog;
use App\Support\NotificationPresenter;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => Face::query()->delete());

function startEmotion(array $game): EmotionRound
{
    Sanctum::actingAs($game[1]);
    test()->postJson("/api/v1/games/{$game[0]->code}/emotion/start")->assertOk();

    return $game[0]->currentEmotionRound()->with('face')->firstOrFail();
}

test('creating a Name the Emotion game with a level, and a suggested name', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/emotion', ['max_players' => 6, 'emotion_level' => 2])
        ->assertCreated()
        ->assertJsonPath('game_type', 'emotion')
        ->assertJsonPath('emotion_level', 2)
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Face Reading:'));
    $this->postJson('/api/v1/games/emotion', ['max_players' => 6, 'emotion_level' => 4])->assertJsonValidationErrors('emotion_level');
    $this->postJson('/api/v1/games/emotion', ['max_players' => 2, 'emotion_level' => 1])->assertJsonValidationErrors('max_players');
});

test('a round needs three players and a face, and shows one at the game\'s level with that many options', function (int $level, int $options) {
    $game = emotionGame(2, $level);
    Sanctum::actingAs($game[1]);
    face('fear', $level);
    face('joy', $level === 1 ? 2 : 1);
    $this->postJson("/api/v1/games/{$game[0]->code}/emotion/start")->assertUnprocessable();

    GamePlayer::factory()->create(['game_id' => $game[0]->id, 'user_id' => User::factory()]);
    $response = $this->postJson("/api/v1/games/{$game[0]->code}/emotion/start")->assertOk()
        ->assertJsonPath('status', 'active')
        ->assertJsonPath('emotion.level', $level)
        ->assertJsonPath('emotion.result', null)
        ->assertJsonCount($options, 'emotion.options');

    expect($response->json('emotion.options'))->toContain('fear')
        ->and($response->json('emotion.image_url'))->toEndWith('.jpg')
        // The answer stays hidden until the reveal.
        ->and($response->json('emotion'))->not->toHaveKey('emotion');
})->with([[1, 4], [2, 6], [3, 7]]);

test('with no faces at all, the host is told', function () {
    $game = emotionGame(3);
    Sanctum::actingAs($game[1]);

    $this->postJson("/api/v1/games/{$game[0]->code}/emotion/start")
        ->assertUnprocessable()
        ->assertJsonPath('errors.game.0', 'There are no faces yet. An admin needs to add some.');
});

test('picks stay secret until everyone has answered; then the right ones score and the face learns its hit rate', function () {
    Notification::fake();
    [$game, $host, [$a, $b, $c]] = emotionGame(3);
    $face = face('sadness');
    $round = startEmotion([$game, $host]);
    $wrong = collect($round->options)->first(fn (string $emotion) => $emotion !== 'sadness');

    Sanctum::actingAs($a);
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => $wrong])->assertOk()
        ->assertJsonPath('emotion.my_answer', $wrong)
        ->assertJsonPath('emotion.answered_user_ids', [$a->id]);
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => 'sadness'])->assertOk()
        ->assertJsonPath('emotion.my_answer', 'sadness');

    $missing = collect(EmotionCatalog::EMOTIONS)->first(fn (string $emotion) => ! in_array($emotion, $round->options, true));
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => $missing])->assertUnprocessable();

    Sanctum::actingAs($b);
    $this->getJson("/api/v1/games/{$game->code}")->assertJsonPath('emotion.my_answer', null)->assertJsonPath('emotion.result', null);
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => $wrong])->assertOk()->assertJsonPath('status', 'active');

    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => 'sadness'])->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('emotion.result.emotion', 'sadness')
        ->assertJsonPath('emotion.result.hit_rate', 0.67)
        ->assertJsonPath('emotion.result.answers_so_far', 3)
        ->assertJsonCount(3, 'emotion.result.answers');

    expect($face->fresh())->shown_count->toBe(3)->correct_count->toBe(2)
        ->and(GamePlayer::where('user_id', $a->id)->value('score'))->toBe(1)
        ->and(GamePlayer::where('user_id', $b->id)->value('score'))->toBe(0);

    Notification::assertSentTo($b, RoundEnded::class, function (RoundEnded $notification) use ($b) {
        return str_contains(NotificationPresenter::present($notification->toArray($b), 'en')['body'], 'named the emotion');
    });

    Sanctum::actingAs($host);
    face('anger');
    $this->postJson("/api/v1/games/{$game->code}/emotion/start")->assertOk()
        ->assertJsonPath('emotion.number', 2)
        ->assertJsonPath('history.0.emotion', 'sadness');
});

test('the host can reveal early; nobody else can', function () {
    [$game, $host, [$a, $b]] = emotionGame(3);
    face('anger');
    startEmotion([$game, $host]);

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game->code}/emotion/answer", ['emotion' => 'anger'])->assertOk();
    $this->postJson("/api/v1/games/{$game->code}/emotion/reveal")->assertForbidden();

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/emotion/reveal")->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonCount(1, 'emotion.result.answers');
    $this->postJson("/api/v1/games/{$game->code}/emotion/reveal")->assertUnprocessable();
});

test('a face plays at its starting level until enough answers, then at the level its hit rate earns', function () {
    $hard = face('fear', 3);
    $measuredEasy = face('fear', 3, ['shown_count' => 40, 'correct_count' => 36]);
    $measuredMedium = face('joy', 1, ['shown_count' => 20, 'correct_count' => 14]);
    $measuredHard = face('joy', 1, ['shown_count' => 20, 'correct_count' => 5]);
    $fresh = face('joy', 1, ['shown_count' => 19, 'correct_count' => 0]);

    expect(Face::atLevel(1)->pluck('id')->sort()->values()->all())->toBe([$measuredEasy->id, $fresh->id])
        ->and(Face::atLevel(2)->pluck('id')->all())->toBe([$measuredMedium->id])
        ->and(Face::atLevel(3)->pluck('id')->sort()->values()->all())->toBe([$hard->id, $measuredHard->id])
        ->and($measuredEasy->level())->toBe(1)
        ->and($fresh->level())->toBe(1);

    $measuredEasy->update(['active' => false]);
    expect(Face::atLevel(1)->pluck('id')->all())->toBe([$fresh->id]);
});

test('back to recruiting abandons the round, and the web pages render', function () {
    [$game, $host] = emotionGame(3);
    face();
    startEmotion([$game, $host]);

    $this->postJson("/api/v1/games/{$game->code}/reset")->assertOk()->assertJsonPath('status', 'recruiting');
    expect($game->emotionRounds()->first()->ending)->toBe(EmotionRound::ENDING_ABANDONED)
        ->and($game->fresh()->status)->toBe(GameStatus::Recruiting);

    $this->actingAs($host)->get(route('games.show', $game))->assertInertia(fn ($page) => $page->component('games/EmotionLobby'));
    $this->get(route('games.emotion'))->assertInertia(fn ($page) => $page->component('games/Emotion'));
    $this->post(route('emotion.store'), ['title' => 'Faces', 'max_players' => 4, 'emotion_level' => 3])->assertRedirect();
    $this->assertDatabaseHas('games', ['title' => 'Faces', 'game_type' => 'emotion', 'emotion_level' => 3]);
});

test('the shipped faces all have an image, and every level offers each basic emotion', function () {
    $this->artisan('migrate:refresh', ['--path' => 'database/migrations/2026_10_27_100100_seed_emotion_faces.php'])->assertSuccessful();

    $faces = Face::all();
    expect($faces)->toHaveCount(660)
        ->and($faces->where('active', true))->toHaveCount(580)
        ->and($faces->every(fn (Face $face) => is_file(public_path($face->image))))->toBeTrue();

    foreach (EmotionCatalog::LEVELS as $level) {
        $emotions = Face::atLevel($level)->distinct()->pluck('emotion');
        expect($emotions->count())->toBeGreaterThanOrEqual(5);
    }

    expect(Face::atLevel(1)->distinct()->pluck('emotion')->sort()->values()->all())
        ->toBe(['anger', 'disgust', 'fear', 'joy', 'sadness', 'surprise']);
});

test('rounds give every emotion an equal chance, however many faces each has', function () {
    [$game, $host] = emotionGame(3);
    foreach (range(1, 12) as $n) {
        face('joy');
    }
    face('anger');

    $emotions = collect(range(1, 40))->map(function () use ($game, $host) {
        $game->emotionRounds()->delete();
        $game->newQuery()->whereKey($game->id)->update(['status' => GameStatus::Recruiting]);

        return startEmotion([$game, $host])->face->emotion;
    });

    expect($emotions->countBy()->get('anger'))->toBeGreaterThan(8);
});
