<?php

namespace App\Queries;

use App\Enums\InvitationStatus;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Who a host can invite. Without a search, only people they have played
 * with before; with one, anyone whose name or codename matches. Never the
 * whole user table, which would leak every account and not scale.
 */
class InvitableUsersQuery
{
    public const LIMIT = 20;

    public const MIN_SEARCH_LENGTH = 2;

    /**
     * Each user is flagged 'pending' only when a pending invitation exists
     * (a declined row is free to re-invite, so it surfaces as null).
     *
     * @return Collection<int, array{id: int, name: string, codename: string, invite_status: 'pending'|null}>
     */
    public function for(Game $game, User $host, ?string $search = null): Collection
    {
        $rosterUserIds = $game->players()->pluck('user_id');
        $pendingInviteeIds = $game->invitations()->where('status', InvitationStatus::Pending)->pluck('to_user_id');
        $search = trim((string) $search);

        $query = User::query()
            ->where('id', '!=', $host->id)
            ->whereNotIn('id', $rosterUserIds);

        if (mb_strlen($search) >= self::MIN_SEARCH_LENGTH) {
            $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
            $query->where(fn ($query) => $query
                ->whereRaw('lower(name) like ?', [$like])
                ->orWhereRaw('lower(codename) like ?', [$like]));
        } else {
            $query->whereIn('id', GamePlayer::query()
                ->whereIn('game_id', $host->gamePlayers()->select('game_id'))
                ->select('user_id'));
        }

        return $query
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'codename'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'invite_status' => $pendingInviteeIds->contains($user->id) ? 'pending' : null,
            ]);
    }
}
