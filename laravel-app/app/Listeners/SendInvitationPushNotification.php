<?php

namespace App\Listeners;

use App\Events\InvitationIssued;
use App\Models\PushToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;

class SendInvitationPushNotification implements ShouldQueue
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    public function handle(InvitationIssued $event): void
    {
        $invitation = $event->invitation->loadMissing(['game', 'fromUser', 'toUser.pushTokens']);
        $tokens = $invitation->toUser->pushTokens->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $messages = array_values($tokens->map(fn (PushToken $token) => [
            'to' => $token->token,
            'title' => 'New operation invite',
            'body' => "{$invitation->fromUser->codename} invited you to {$invitation->game->title}",
            'sound' => 'default',
            'channelId' => 'invitations',
            'data' => [
                'type' => 'invitation',
                'invitation_id' => $invitation->id,
                'code' => $invitation->game->code,
            ],
        ])->all());

        $request = Http::acceptJson()->asJson();

        if ($accessToken = config('services.expo.access_token')) {
            $request = $request->withToken($accessToken);
        }

        // Tickets come back in the same order as the messages.
        $tickets = $request->post(self::EXPO_PUSH_URL, $messages)->throw()->json('data', []);

        foreach ($tickets as $index => $ticket) {
            if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                $tokens[$index]->delete();
            }
        }
    }
}
