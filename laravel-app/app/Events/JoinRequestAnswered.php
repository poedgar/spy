<?php

namespace App\Events;

use App\Models\JoinRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Tells the requester, live, whether the host let them in.
 */
class JoinRequestAnswered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public JoinRequest $joinRequest,
        public bool $approved,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->joinRequest->user_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->joinRequest->loadMissing('game');

        return [
            'approved' => $this->approved,
            'game_code' => $this->joinRequest->game->code,
            'game_title' => $this->joinRequest->game->title,
            'game_type' => $this->joinRequest->game->game_type->value,
        ];
    }

    public function broadcastAs(): string
    {
        return 'join.answered';
    }
}
