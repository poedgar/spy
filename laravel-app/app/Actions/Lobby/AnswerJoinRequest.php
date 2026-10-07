<?php

namespace App\Actions\Lobby;

use App\Actions\Games\JoinGame;
use App\Enums\InvitationStatus;
use App\Events\GameUpdated;
use App\Events\JoinRequestAnswered;
use App\Events\JoinRequestDecided;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\JoinRequest;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class AnswerJoinRequest
{
    public function __construct(private JoinGame $joinGame) {}

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $requestId, bool $approve): void
    {
        abort_unless($game->isHost($host), 403);

        $request = JoinRequest::where('game_id', $game->id)->findOrFail($requestId);

        if ($request->status !== InvitationStatus::Pending) {
            throw new GameRuleException('game', __('That request has already been answered.'));
        }

        if ($approve) {
            // Same rules as any join: still recruiting, still a free seat.
            $this->joinGame->handle($game, $request->user()->firstOrFail());
        }

        $request->update(['status' => $approve ? InvitationStatus::Accepted : InvitationStatus::Declined]);

        JoinRequestDecided::dispatch($request, $approve);
        BestEffortBroadcast::dispatch(new JoinRequestAnswered($request, $approve));
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));
    }
}
