<?php

use App\Actions\Games\JoinGame;
use App\Actions\Invitations\AcceptInvitation;
use App\Events\PlayerJoined;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('PlayerJoined broadcasts on the games private channel with a safe payload', function () {
    $game = Game::factory()->create();
    $user = User::factory()->create(['email' => 'secret@example.com']);
    $player = GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    $event = new PlayerJoined($player);

    expect($event->broadcastOn()[0]->name)->toBe('private-game.'.$game->id)
        ->and($event->broadcastAs())->toBe('player.joined');

    $payload = $event->broadcastWith();
    expect($payload['player_count'])->toBe(1)
        ->and($payload['player']['user'])->toBe(['id' => $user->id, 'name' => $user->name, 'codename' => $user->codename])
        ->and(json_encode($payload))->not->toContain('secret@example.com');
});

test('joining a game dispatches PlayerJoined once, and not for the already-joined no-op', function () {
    Event::fake([PlayerJoined::class]);
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    app(JoinGame::class)->handle($game, $user);
    app(JoinGame::class)->handle($game, $user);

    Event::assertDispatchedTimes(PlayerJoined::class, 1);
});

test('accepting an invitation dispatches PlayerJoined, but not when already on the roster', function () {
    Event::fake([PlayerJoined::class]);
    $game = Game::factory()->create(['max_players' => 6]);
    $newcomer = User::factory()->create();
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);

    app(AcceptInvitation::class)->handle(
        Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $newcomer->id]), $newcomer);
    app(AcceptInvitation::class)->handle(
        Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $member->id]), $member);

    Event::assertDispatchedTimes(PlayerJoined::class, 1);
});
