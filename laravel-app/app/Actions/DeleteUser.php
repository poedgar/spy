<?php

namespace App\Actions;

use App\Models\User;

class DeleteUser
{
    public function handle(User $user): void
    {
        // Sanctum tokens are a polymorphic relation with no FK cascade, so
        // they must be removed explicitly. Game, invitation and push-token
        // rows cascade from the users FK.
        $user->tokens()->delete();
        $user->delete();
    }
}
