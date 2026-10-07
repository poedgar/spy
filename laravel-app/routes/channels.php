<?php

use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

Broadcast::channel('online-users', function (User $user): array {
    return [
        'id' => $user->id,
        'codename' => $user->codename,
    ];
});

Broadcast::channel('game.{gameId}', function (User $user, int $gameId): bool {
    return GamePlayer::where('game_id', $gameId)->where('user_id', $user->id)->exists();
});
