<?php

namespace App\Queries;

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class SpyHomeQuery
{
    /**
     * @return Collection<int, Game>
     */
    public function games(User $user): Collection
    {
        return $user
            ->gamePlayers()
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();
    }

    /**
     * @return EloquentCollection<int, Invitation>
     */
    public function pendingInvitations(User $user): EloquentCollection
    {
        return $user
            ->receivedInvitations()
            ->where('status', 'pending')
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game:id,title,code', 'fromUser:id,codename')
            ->get();
    }
}
