<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invitation
 */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'game_type' => $this->game->game_type,
            'game_title' => $this->game->title,
            'game_code' => $this->game->code,
            'from_codename' => $this->fromUser->codename,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
