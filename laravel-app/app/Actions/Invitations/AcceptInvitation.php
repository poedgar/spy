<?php

namespace App\Actions\Invitations;

use App\Enums\GameStatus;
use App\Enums\InvitationStatus;
use App\Enums\PlayerStatus;
use App\Events\PlayerJoined;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class AcceptInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Invitation $invitation, User $user): Game
    {
        abort_unless($invitation->to_user_id === $user->id, 403);

        $player = DB::transaction(function () use ($invitation, $user): ?GamePlayer {
            // Locked like JoinGame, so an invite and a code join racing for
            // the last seat cannot both take it.
            $game = $invitation->game->freshLocked();
            $invitation->refresh();

            if ($invitation->status !== InvitationStatus::Pending) {
                throw new GameRuleException('invitation', __('This invitation is no longer available.'));
            }

            if ($game->status !== GameStatus::Recruiting) {
                throw new GameRuleException('invitation', __('This operation is no longer recruiting.'));
            }

            // A user who joined by code after being invited should have their
            // invitation resolved gracefully, not hit the game_players unique
            // constraint.
            $alreadyJoined = $game->hasPlayer($user);

            if (! $alreadyJoined && $game->players()->count() >= $game->max_players) {
                throw new GameRuleException('invitation', __('This operation roster is already full.'));
            }

            $invitation->update(['status' => InvitationStatus::Accepted]);

            return $alreadyJoined ? null : GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $user->id,
                'is_host' => false,
                'status' => PlayerStatus::Ready,
                'joined_at' => now(),
            ]);
        });

        if ($player) {
            BestEffortBroadcast::dispatch(new PlayerJoined($player));
        }

        return $invitation->game->refresh();
    }
}
