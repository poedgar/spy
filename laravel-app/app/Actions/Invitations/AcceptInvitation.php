<?php

namespace App\Actions\Invitations;

use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AcceptInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Invitation $invitation, User $user): Game
    {
        abort_unless($invitation->to_user_id === $user->id, 403);

        if ($invitation->status !== 'pending') {
            throw new GameRuleException('invitation', 'This invitation is no longer available.');
        }

        $game = $invitation->game;

        if ($game->status !== 'recruiting') {
            throw new GameRuleException('invitation', 'This operation is no longer recruiting.');
        }

        // Mirrors JoinGame's already-joined guard: a user who joined by code
        // after being invited should have their invitation resolved
        // gracefully, not hit the game_players unique constraint.
        $alreadyJoined = $game->players()->where('user_id', $user->id)->exists();

        if (! $alreadyJoined && $game->players()->count() >= $game->max_players) {
            throw new GameRuleException('invitation', 'This operation roster is already full.');
        }

        DB::transaction(function () use ($alreadyJoined, $game, $user, $invitation): void {
            if (! $alreadyJoined) {
                GamePlayer::create([
                    'game_id' => $game->id,
                    'user_id' => $user->id,
                    'is_host' => false,
                    'status' => 'ready',
                    'joined_at' => now(),
                ]);
            }

            $invitation->update(['status' => 'accepted']);
        });

        return $game;
    }
}
