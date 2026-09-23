<?php

namespace App\Events;

use App\Models\Invitation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvitationSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Invitation $invitation,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->invitation->to_user_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->invitation->loadMissing(['game', 'fromUser']);

        return [
            'invitation_id' => $this->invitation->id,
            'game_title' => $this->invitation->game->title,
            'game_code' => $this->invitation->game->code,
            'from_codename' => $this->invitation->fromUser->codename,
        ];
    }

    public function broadcastAs(): string
    {
        return 'invitation.sent';
    }
}
