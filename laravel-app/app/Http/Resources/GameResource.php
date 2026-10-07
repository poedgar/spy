<?php

namespace App\Http\Resources;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Game
 */
class GameResource extends JsonResource
{
    /**
     * The round's location and spies are never included wholesale: the
     * nested RoundResource shapes them for the requesting player.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $playerCount = $this->players_count
            ?? ($this->relationLoaded('players') ? $this->players->count() : $this->players()->count());

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'game_type' => $this->game_type,
            'game_mode' => $this->game_mode,
            'age_tier' => $this->age_tier,
            'max_players' => $this->max_players,
            'min_players' => Game::MIN_PLAYERS,
            'mission_briefing' => $this->mission_briefing,
            'status' => $this->status,
            'host_id' => $this->host_id,
            'player_count' => $playerCount,
            'spy_count' => Game::spyCountFor($playerCount),
            'created_at' => $this->created_at?->toIso8601String(),
            'host' => OperativeResource::make($this->whenLoaded('host')),
            'players' => PlayerResource::collection($this->whenLoaded('players')),
            // A reset game keeps its last round in the database, but the
            // lobby has moved on, so it is only shown while still relevant.
            'round' => $this->when(
                $this->relationLoaded('currentRound'),
                fn () => $this->status === GameStatus::Recruiting || $this->currentRound === null
                    ? null
                    : RoundResource::make($this->currentRound),
            ),
        ];
    }
}
