<?php

namespace App\Events;

use App\Models\GamePlayer;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerJoined implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GamePlayer $player,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('game.'.$this->player->game_id),
        ];
    }

    /**
     * Built by hand rather than via an API Resource: this goes to every
     * roster member, so it must never include the joiner's email.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->player->loadMissing('user');

        return [
            'player' => [
                'id' => $this->player->id,
                'user' => [
                    'id' => $this->player->user->id,
                    'name' => $this->player->user->name,
                    'codename' => $this->player->user->codename,
                ],
                'is_host' => $this->player->is_host,
                'status' => $this->player->status,
                'joined_at' => $this->player->joined_at->toIso8601String(),
            ],
            'player_count' => GamePlayer::where('game_id', $this->player->game_id)->count(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'player.joined';
    }
}
