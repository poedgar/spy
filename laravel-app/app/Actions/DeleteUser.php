<?php

namespace App\Actions;

use App\Actions\Lobby\HandOverHost;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PhraseEnding;
use App\Enums\RoundEnding;
use App\Events\GameUpdated;
use App\Models\Game;
use App\Models\User;
use App\Notifications\BecameHost;
use App\Support\BestEffortBroadcast;
use Illuminate\Support\Facades\DB;

class DeleteUser
{
    public function __construct(private HandOverHost $handOver) {}

    public function handle(User $user): void
    {
        /** @var list<array{0: Game, 1: int}> $handedOver */
        $handedOver = [];

        DB::transaction(function () use ($user, &$handedOver) {
            // Games cascade from their host, so hand each one to another
            // player first; only games with nobody else left disappear.
            foreach (Game::where('host_id', $user->id)->get() as $game) {
                $game = $game->freshLocked();
                $this->abandonRound($game);

                $newHostId = $this->handOver->toNextPlayer($game, $user->id);

                if ($newHostId !== null) {
                    $handedOver[] = [$game, $newHostId];
                }
            }

            // Sanctum tokens are a polymorphic relation with no FK cascade, so
            // they must be removed explicitly. Roster, invitation and push-token
            // rows cascade from the users FK.
            $user->tokens()->delete();
            $user->delete();
        });

        foreach ($handedOver as [$game, $newHostId]) {
            $game->refresh();
            User::find($newHostId)?->notify(new BecameHost($game));
            BestEffortBroadcast::dispatch(new GameUpdated($game));
        }
    }

    /**
     * A round dealt with the departing player can't be finished fairly.
     */
    private function abandonRound(Game $game): void
    {
        if ($game->game_type === GameType::Spy && $game->status->inRound()) {
            $game->currentRound()->firstOrFail()->update(['ending' => RoundEnding::Abandoned, 'ended_at' => now()]);
        }

        if ($game->game_type === GameType::Phrase && $game->status === GameStatus::Active) {
            $game->currentPhraseRound()->firstOrFail()->update(['ending' => PhraseEnding::Abandoned, 'ended_at' => now()]);
        }

        if ($game->status->inRound()) {
            $game->update(['status' => GameStatus::Recruiting]);
        }
    }
}
