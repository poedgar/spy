<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
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
            'email' => $this->when($request->user()?->id === $this->id, $this->email),
            'locale' => $this->when($request->user()?->id === $this->id, fn () => $this->locale),
            'email_verified' => $this->when($request->user()?->id === $this->id, fn () => $this->hasVerifiedEmail()),
            // True while this account must confirm its email before playing.
            'must_verify_email' => $this->when(
                $request->user()?->id === $this->id,
                fn () => (bool) config('app.require_verified_email') && ! $this->hasVerifiedEmail(),
            ),
            'email_notifications' => $this->when($request->user()?->id === $this->id, fn () => $this->email_notifications),
        ];
    }
}
