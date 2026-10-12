<?php

namespace App\Http\Resources;

use App\Actions\Song\CloseSongVoting;
use App\Models\SongRound;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One player's view of a Sing It Out round. The song's name stays hidden
 * until the round ends (it would give the ending away); votes are secret:
 * only who has voted shows, and the totals at the end.
 *
 * @mixin SongRound
 */
class SongRoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;
        $votes = $this->votes ?? [];
        $ended = $this->hasEnded();

        return [
            'number' => $this->number,
            'clip_url' => $this->song?->embedUrl(),
            'turn_order' => $this->turn_order,
            'singer_user_id' => $ended ? null : $this->singerId(),
            'sung_count' => min($this->turn_index, count($this->turn_order)),
            'voted_user_ids' => array_map('intval', array_keys($votes)),
            'my_vote' => $viewerId === null ? null : ($votes[$viewerId] ?? null),
            'scoring' => ['win' => CloseSongVoting::WIN_POINTS],
            'started_at' => $this->started_at->toIso8601String(),
            'voting_started_at' => $this->voting_started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'result' => $ended ? [
                'ending' => $this->ending,
                'title' => $this->song?->title,
                'artist' => $this->song?->artist,
                'winner_user_ids' => $this->winner_user_ids ?? [],
                'votes' => collect($this->tally())->map(fn (int $count, int $userId) => ['user_id' => $userId, 'votes' => $count])->values(),
            ] : null,
        ];
    }
}
