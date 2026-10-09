<?php

namespace App\Http\Resources;

use App\Models\GameRound;
use App\Models\RoundVote;
use App\Support\LocationCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One player's view of a round. While it runs, a player learns only their
 * own role (spies are not told who the other spies are), the location if
 * they are not a spy, and who has voted (not for whom). Once it ends,
 * everything is revealed to the table.
 *
 * @mixin GameRound
 */
class RoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;
        $isSpy = $viewerId !== null && $this->isSpy($viewerId);
        $ended = $this->hasEnded();
        $votes = $this->votes;
        $myVote = $votes->firstWhere('voter_id', $viewerId);

        return [
            'number' => $this->number,
            'spy_count' => count($this->spy_user_ids),
            'started_at' => $this->started_at->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'voting_started_at' => $this->voting_started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'my_role' => $viewerId === null ? null : ($isSpy ? 'spy' : 'loyalist'),
            'location' => $isSpy && ! $ended ? null : LocationCatalog::present($this->location_id),
            'voted_user_ids' => $votes->pluck('voter_id')->values(),
            'my_vote' => $myVote?->suspect_id,
            'result' => $ended ? [
                'ending' => $this->ending,
                'winning_team' => $this->winning_team,
                'spy_user_ids' => $this->spy_user_ids,
                'accused_user_id' => $this->accused_user_id,
                'guessed_by_user_id' => $this->guessed_by_user_id,
                'guessed_location' => LocationCatalog::present($this->guessed_location_id),
                'votes' => $votes->map(fn (RoundVote $vote) => [
                    'voter_id' => $vote->voter_id,
                    'suspect_id' => $vote->suspect_id,
                ])->values(),
                'vote_counts' => $votes->countBy('suspect_id'),
            ] : null,
        ];
    }
}
