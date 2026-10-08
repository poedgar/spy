<?php

namespace App\Http\Resources;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\InvitationStatus;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\JoinRequest;
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
        $viewerIsHost = $request->user()?->id === $this->host_id;
        $playerCount = $this->players_count
            ?? ($this->relationLoaded('players') ? $this->players->count() : $this->players()->count());

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'game_type' => $this->game_type,
            'game_mode' => $this->game_mode,
            'age_tier' => $this->age_tier,
            'phrase_language' => $this->phrase_language,
            'max_players' => $this->max_players,
            'max_allowed_players' => $this->game_type->maxPlayers(),
            'min_players' => Game::MIN_PLAYERS,
            'mission_briefing' => $this->mission_briefing,
            'status' => $this->status,
            'host_id' => $this->host_id,
            'requires_approval' => $this->requires_approval,
            'is_listed' => $this->is_listed,
            'player_count' => $playerCount,
            'spy_count' => Game::spyCountFor($playerCount),
            'created_at' => $this->created_at?->toIso8601String(),
            'host' => OperativeResource::make($this->whenLoaded('host')),
            'players' => PlayerResource::collection($this->whenLoaded('players')),
            // The host's to-do list: who is waiting to get in, and who was
            // invited but hasn't joined (or turned it down).
            'join_requests' => $this->when(
                $viewerIsHost && $this->relationLoaded('joinRequests'),
                fn () => $this->joinRequests
                    ->where('status', InvitationStatus::Pending)
                    ->map(fn (JoinRequest $joinRequest) => [
                        'id' => $joinRequest->id,
                        'user' => OperativeResource::make($joinRequest->user),
                        'created_at' => $joinRequest->created_at?->toIso8601String(),
                    ])->values(),
            ),
            'invitations' => $this->when(
                $viewerIsHost && $this->relationLoaded('invitations'),
                fn () => $this->invitations
                    ->where('status', '!=', InvitationStatus::Accepted)
                    ->map(fn (Invitation $invitation) => [
                        'id' => $invitation->id,
                        'status' => $invitation->status,
                        'user' => OperativeResource::make($invitation->toUser),
                        'updated_at' => $invitation->updated_at?->toIso8601String(),
                    ])->values(),
            ),
            // A reset game keeps its last round in the database, but the
            // lobby has moved on, so it is only shown while still relevant.
            'round' => $this->when(
                $this->game_type === GameType::Spy && $this->relationLoaded('currentRound'),
                fn () => $this->status === GameStatus::Recruiting || $this->currentRound === null
                    ? null
                    : RoundResource::make($this->currentRound),
            ),
            'phrase' => $this->when(
                $this->game_type === GameType::Phrase && $this->relationLoaded('currentPhraseRound'),
                fn () => $this->status === GameStatus::Recruiting || $this->currentPhraseRound === null
                    ? null
                    : PhraseRoundResource::make($this->currentPhraseRound),
            ),
        ];
    }
}
