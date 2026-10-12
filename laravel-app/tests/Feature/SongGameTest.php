<?php

use App\Enums\GameStatus;
use App\Models\GamePlayer;
use App\Models\Song;
use App\Models\SongRound;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Notifications\YourTurnToSing;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

function startSong(array $game): SongRound
{
    Sanctum::actingAs($game[1]);
    test()->postJson("/api/v1/games/{$game[0]->code}/song/start")->assertOk();

    return $game[0]->currentSongRound()->firstOrFail();
}

/** Everyone sings in order (each singer ends their own turn). */
function singAll(array $game, SongRound $round): void
{
    $users = collect($game[2])->keyBy('id');

    foreach ($round->turn_order as $singerId) {
        Sanctum::actingAs($users[$singerId]);
        test()->postJson("/api/v1/games/{$game[0]->code}/song/turn")->assertOk();
    }
}

test('creating a Sing It Out game, with a suggested name when none is given', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games/song', ['max_players' => 6])
        ->assertCreated()
        ->assertJsonPath('game_type', 'song')
        ->assertJsonPath('title', fn (string $title) => str_starts_with($title, 'Song Night:'));
    $this->postJson('/api/v1/games/song', ['max_players' => 2])->assertJsonValidationErrors('max_players');
});

test('a round needs three players and a clip, and deals one the game has not heard', function () {
    $game = songGame(2);
    songClip();
    Sanctum::actingAs($game[1]);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/start")->assertUnprocessable();

    GamePlayer::factory()->create(['game_id' => $game[0]->id, 'user_id' => User::factory()]);
    SongRound::query()->delete();
    $first = songClip('First');
    $second = songClip('Second');
    $game[0]->songRounds()->create(['number' => 1, 'song_id' => $first->id, 'turn_order' => [], 'started_at' => now(), 'ended_at' => now()]);
    Song::whereNotIn('id', [$first->id, $second->id])->delete();

    $this->postJson("/api/v1/games/{$game[0]->code}/song/start")
        ->assertOk()
        ->assertJsonPath('status', 'active')
        ->assertJsonPath('song.number', 2)
        ->assertJsonPath('song.result', null);

    expect($game[0]->currentSongRound()->first()->song_id)->toBe($second->id);
});

test('without any clips the host is told to ask an admin', function () {
    $game = songGame(3);
    Sanctum::actingAs($game[1]);

    $this->postJson("/api/v1/games/{$game[0]->code}/song/start")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'There are no songs yet. An admin needs to add some.');
});

test('players sing in turn; only the singer or host ends a turn; the next singer is pushed', function () {
    Notification::fake();
    $game = songGame(3);
    songClip();
    $round = startSong($game);
    $users = collect($game[2])->keyBy('id');
    [$first, $second] = $round->turn_order;
    $bystander = collect($round->turn_order)->first(fn (int $id) => $id !== $first && $id !== $game[1]->id);

    if ($bystander !== null) {
        Sanctum::actingAs($users[$bystander]);
        $this->postJson("/api/v1/games/{$game[0]->code}/song/turn")->assertUnprocessable();
    }

    Sanctum::actingAs($users[$first]);
    $this->getJson("/api/v1/games/{$game[0]->code}")->assertJsonPath('song.singer_user_id', $first);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/turn")->assertOk()->assertJsonPath('song.singer_user_id', $second);

    if ($second !== $first) {
        Notification::assertSentTo($users[$second], YourTurnToSing::class);
    }
});

test('after the last singer the table votes; secret ballots; the winner scores once everyone votes', function () {
    Notification::fake();
    $game = songGame(3);
    songClip('Bohemian Rhapsody', 'Queen');
    $round = startSong($game);
    singAll($game, $round);
    [$a, $b, $c] = $game[2];

    Sanctum::actingAs($a);
    $this->getJson("/api/v1/games/{$game[0]->code}")->assertJsonPath('status', 'voting');
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $a->id])->assertUnprocessable();
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $b->id])
        ->assertOk()
        ->assertJsonPath('song.my_vote', $b->id)
        ->assertJsonPath('song.voted_user_ids', [$a->id]);

    // Others see that A voted, not for whom.
    Sanctum::actingAs($b);
    $this->getJson("/api/v1/games/{$game[0]->code}")->assertJsonPath('song.my_vote', null)->assertJsonPath('song.result', null);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $c->id])->assertOk();

    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $b->id])
        ->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('song.result.title', 'Bohemian Rhapsody')
        ->assertJsonPath('song.result.winner_user_ids', [$b->id]);

    expect(GamePlayer::where('user_id', $b->id)->value('score'))->toBe(1)
        ->and(GamePlayer::where('user_id', $c->id)->value('score'))->toBe(0);
    Notification::assertSentTo([$a, $b], RoundEnded::class, fn (RoundEnded $n) => $n->params()['song_winners'] === $b->codename);
    Notification::assertNotSentTo($c, RoundEnded::class);
});

test('the host can close voting early; ties all score; no votes, nobody scores', function () {
    $game = songGame(4);
    songClip();
    $round = startSong($game);
    singAll($game, $round);
    [$host, $b, $c, $d] = $game[2];

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $c->id])->assertOk();
    Sanctum::actingAs($c);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/vote", ['singer_id' => $d->id])->assertOk();

    Sanctum::actingAs($b);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/close")->assertForbidden();
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/close")
        ->assertOk()
        ->assertJsonPath('song.result.winner_user_ids', [$c->id, $d->id]);

    // A second round where nobody votes.
    $round = startSong($game);
    singAll($game, $round);
    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game[0]->code}/song/close")->assertOk()->assertJsonPath('song.result.winner_user_ids', []);
    expect(GamePlayer::where('user_id', $c->id)->value('score'))->toBe(1);
});

test('the clip is the stretch of the video set for it, and back to recruiting abandons the round', function () {
    $game = songGame(3);
    songClip();
    startSong($game);

    $this->getJson("/api/v1/games/{$game[0]->code}")
        ->assertJsonPath('song.clip_url', 'https://www.youtube-nocookie.com/embed/fJ9rUzIMcZQ?start=60&end=75&rel=0&playsinline=1');

    $this->postJson("/api/v1/games/{$game[0]->code}/reset")->assertOk()->assertJsonPath('status', 'recruiting');
    expect($game[0]->songRounds()->first()->ending)->toBe(SongRound::ENDING_ABANDONED)
        ->and($game[0]->fresh()->status)->toBe(GameStatus::Recruiting);
});

test('the web lobby and home render Sing It Out', function () {
    $game = songGame(3);

    $this->actingAs($game[1])->get(route('games.show', $game[0]))->assertInertia(fn ($page) => $page->component('games/SongLobby'));
    $this->get(route('games.song'))->assertInertia(fn ($page) => $page->component('games/Song'));
});
