<?php

namespace App\Http\Resources;

use App\Models\GamePlayer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GamePlayer
 */
class PlayerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => OperativeResource::make($this->whenLoaded('user')),
            'is_host' => $this->is_host,
            'status' => $this->status,
            'score' => $this->score,
            'joined_at' => $this->joined_at->toIso8601String(),
        ];
    }
}
