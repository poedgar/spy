<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A user as other players see them: never any contact details, not even
 * the viewer's own, since lobby payloads are shared verbatim.
 *
 * @mixin User
 */
class OperativeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'codename' => $this->codename,
        ];
    }
}
