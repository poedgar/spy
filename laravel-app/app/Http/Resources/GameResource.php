<?php

namespace App\Http\Resources;

use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Game
 */
class GameResource extends JsonResource
{
    /**
     * secret_location is deliberately absent: it must never reach a client.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'game_type' => $this->game_type,
            'game_mode' => $this->game_mode,
            'max_players' => $this->max_players,
            'mission_briefing' => $this->mission_briefing,
            'status' => $this->status,
            'host_id' => $this->host_id,
            'player_count' => $this->relationLoaded('players') ? $this->players->count() : $this->players()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'host' => UserResource::make($this->whenLoaded('host')),
            'players' => PlayerResource::collection($this->whenLoaded('players')),
        ];
    }
}
