<?php

use App\Events\InvitationSent;
use App\Models\Invitation;
use Illuminate\Broadcasting\PrivateChannel;

test('it broadcasts on the recipients private channel', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    $channels = $event->broadcastOn();

    expect($channels)->toHaveCount(1)
        ->and($channels[0])->toBeInstanceOf(PrivateChannel::class)
        ->and($channels[0]->name)->toBe('private-user.'.$invitation->to_user_id);
});

test('it broadcasts the invitation summary', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    $payload = $event->broadcastWith();

    expect($payload)->toBe([
        'invitation_id' => $invitation->id,
        'game_title' => $invitation->game->title,
        'game_code' => $invitation->game->code,
        'from_codename' => $invitation->fromUser->codename,
    ]);
});

test('it broadcasts as invitation.sent', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    expect($event->broadcastAs())->toBe('invitation.sent');
});
