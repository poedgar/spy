<?php

namespace App\Queries;

use App\Enums\GameType;
use App\Enums\InvitationStatus;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

/**
 * What a game's home screen lists: the user's games of that type, newest
 * first, and the invitations to them still waiting for an answer.
 */
class GameHomeQuery
{
    /**
     * @return Collection<int, Game>
     */
    public function games(User $user, GameType $type = GameType::Spy): Collection
    {
        return $user
            ->gamePlayers()
            ->whereHas('game', fn ($query) => $query->where('game_type', $type))
            ->with(['game' => fn ($query) => $query->withCount('players')])
            ->get()
            ->pluck('game')
            ->sortByDesc('created_at')
            ->values();
    }

    /**
     * @return EloquentCollection<int, Invitation>
     */
    public function pendingInvitations(User $user, GameType $type = GameType::Spy): EloquentCollection
    {
        return $user
            ->receivedInvitations()
            ->where('status', InvitationStatus::Pending)
            ->whereHas('game', fn ($query) => $query->where('game_type', $type))
            ->with('game:id,title,code,game_type', 'fromUser:id,codename')
            ->get();
    }
}
