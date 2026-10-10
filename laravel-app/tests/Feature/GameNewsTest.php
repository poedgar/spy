<?php

use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\Channels\ExpoPushChannel;
use App\Notifications\PlayerLeft;
use App\Notifications\ReadyToStart;
use App\Notifications\RoundEnded;
use App\Notifications\YourTurnToAsk;
use App\Support\NotificationPresenter;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

beforeEach(fn () => Notification::fake());

// --- Phrase: your turn ---------------------------------------------------------

test('passing the turn pushes only the next asker, and keeps nothing in the bell', function () {
    [$game, $host, $players] = phraseGame(3);
    $round = dealPhrase($game, $host);
    $byId = collect($players)->keyBy('id');
    $asker = $byId[$round->turn_order[0]];
    $next = $byId[$round->turn_order[1]];

    Sanctum::actingAs($asker);
    $this->postJson("/api/v1/games/{$game->code}/phrase/turn")->assertOk();

    Notification::assertSentTo($next, YourTurnToAsk::class, fn ($notification, $channels) => $channels === [ExpoPushChannel::class]);
    Notification::assertNotSentTo($asker, YourTurnToAsk::class);
});

// --- Round results -------------------------------------------------------------

test('a spy round result reaches everyone but the host who closed the vote', function () {
    [$game, $host, $players] = gameWithPlayers(4);
    startedRound($game, $host);
    $this->postJson("/api/v1/games/{$game->code}/voting")->assertOk();
    $this->postJson("/api/v1/games/{$game->code}/tally")->assertOk();

    $others = collect($players)->reject(fn (User $user) => $user->is($host));
    Notification::assertSentTo($others, RoundEnded::class, fn (RoundEnded $notification) => $notification->params()['winning_team'] === 'spies'
        && $notification->params()['number'] === 1);
    Notification::assertNotSentTo($host, RoundEnded::class);
});

test('a spy who names the location is not told their own result', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    $round = startedRound($game, $host);
    [$spy] = rolesOf($round, $players);

    Sanctum::actingAs($spy);
    $this->postJson("/api/v1/games/{$game->code}/guess", ['location_id' => $round->location_id])->assertOk();

    Notification::assertNotSentTo($spy, RoundEnded::class);
    Notification::assertSentTo(collect($players)->reject(fn (User $user) => $user->is($spy)), RoundEnded::class);
});

test('abandoning a round sends no result', function () {
    [$game, $host, $players] = gameWithPlayers(3);
    startedRound($game, $host);
    $this->postJson("/api/v1/games/{$game->code}/reset")->assertOk();

    Notification::assertNotSentTo($players, RoundEnded::class);
});

test('a right phrase guess tells the others who won', function () {
    [$game, $host, $players] = phraseGame(3);
    $round = dealPhrase($game, $host);

    Sanctum::actingAs($players[2]);
    $this->postJson("/api/v1/games/{$game->code}/phrase/guess", ['guess' => $round->text()])->assertOk();

    Notification::assertSentTo([$players[0], $players[1]], RoundEnded::class, fn (RoundEnded $notification) => $notification->params()['phrase_ending'] === 'guessed'
        && $notification->params()['winner_codename'] === $players[2]->codename);
    Notification::assertNotSentTo($players[2], RoundEnded::class);
});

test('a revealed phrase tells everyone but the host', function () {
    [$game, $host, $players] = phraseGame(3);
    dealPhrase($game, $host);
    $this->postJson("/api/v1/games/{$game->code}/phrase/reveal")->assertOk();

    Notification::assertSentTo([$players[1], $players[2]], RoundEnded::class, fn (RoundEnded $notification) => $notification->params()['phrase_ending'] === 'revealed');
    Notification::assertNotSentTo($host, RoundEnded::class);
});

test('results read naturally in both languages', function () {
    $base = ['kind' => 'round_ended', 'number' => 2, 'game_code' => 'SPY-AB3D', 'game_title' => 'Nightfall', 'game_type' => 'spy'];

    expect(NotificationPresenter::present([...$base, 'winning_team' => 'loyalists'])['body'])->toBe('The loyalists won in Nightfall.')
        ->and(NotificationPresenter::present([...$base, 'phrase_ending' => 'guessed', 'winner_codename' => 'NIGHT_HAWK'])['body'])->toBe('NIGHT_HAWK guessed the phrase in Nightfall!')
        ->and(NotificationPresenter::present([...$base, 'phrase_ending' => 'time_up'], 'uk')['body'])->toBe('Час у «Nightfall» вийшов. Фразу ніхто не вгадав.')
        ->and(NotificationPresenter::present([...$base, 'winning_team' => 'spies'], 'uk')['title'])->toBe('Раунд 2 завершено');
});

// --- Ready to start ------------------------------------------------------------

test('the host hears once when the table reaches the minimum', function () {
    [$game, $host] = gameWithPlayers(1, ['max_players' => 6]);

    foreach (User::factory()->count(3)->create() as $index => $joiner) {
        Sanctum::actingAs($joiner);
        $this->postJson("/api/v1/games/{$game->code}/join")->assertOk();

        if ($index === 0) {
            Notification::assertNothingSentTo($host);
        }
    }

    Notification::assertSentToTimes($host, ReadyToStart::class, 1);
});

test('an accepted invitation can make the table ready too', function () {
    [$game, $host] = gameWithPlayers(2, ['max_players' => 6]);
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'from_user_id' => $host->id]);

    Sanctum::actingAs($invitation->toUser);
    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")->assertOk();

    Notification::assertSentTo($host, ReadyToStart::class, fn (ReadyToStart $notification) => $notification->params()['count'] === 3);
});

// --- A player left -------------------------------------------------------------

test('the host hears when a player leaves, without a push', function () {
    [$game, $host, $players] = gameWithPlayers(3);

    Sanctum::actingAs($players[1]);
    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();

    Notification::assertSentTo($host, PlayerLeft::class, fn (PlayerLeft $notification) => $notification->params()['from_codename'] === $players[1]->codename
        && $notification->toExpoPush($host) === null);
});

test('a host leaving tells the new host, not that a player left', function () {
    [$game, $host, $players] = gameWithPlayers(2);
    GamePlayer::where('user_id', $host->id)->update(['joined_at' => now()->subMinute()]);

    Sanctum::actingAs($host);
    $this->postJson("/api/v1/games/{$game->code}/leave")->assertNoContent();

    Notification::assertNotSentTo($players[1], PlayerLeft::class);
});
