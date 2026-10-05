<?php

namespace App\Queries;

use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Collection;

class InvitableUsersQuery
{
    /**
     * Everyone except the host and the current roster, alphabetical, each
     * flagged 'pending' only when a pending invitation exists (a declined
     * row is free to re-invite, so it surfaces as null).
     *
     * @return Collection<int, array{id: int, name: string, codename: string, invite_status: 'pending'|null}>
     */
    public function for(Game $game, User $host): Collection
    {
        $rosterUserIds = $game->players()->pluck('user_id');
        $pendingInviteeIds = $game->invitations()->where('status', 'pending')->pluck('to_user_id');

        return User::query()
            ->where('id', '!=', $host->id)
            ->whereNotIn('id', $rosterUserIds)
            ->orderBy('name')
            ->get(['id', 'name', 'codename'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'invite_status' => $pendingInviteeIds->contains($user->id) ? 'pending' : null,
            ]);
    }
}
