<?php

namespace App\Http\Resources;

use App\Actions\Finish\CloseFinishVoting;
use App\Actions\Finish\OpenFinishVoting;
use App\Models\FinishRound;
use App\Models\Prompt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One player's view of a written round (Finish or Interpret the Phrase).
 * While players write, only who has written shows (and your own answer).
 * The vote lists the answers without names, in a shuffled order; names,
 * totals and the phrase's real meaning come with the result.
 *
 * @mixin FinishRound
 */
class FinishRoundResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id;
        $answers = $this->answers ?? [];
        $votes = $this->votes ?? [];
        $order = $this->answer_order ?? [];
        $ended = $this->hasEnded();
        $tally = $ended ? $this->tally() : [];
        $myChoice = $viewerId === null ? null : ($votes[$viewerId] ?? null);
        $myVote = $myChoice === null ? false : array_search((int) $myChoice, $order, true);

        return [
            'number' => $this->number,
            'prompt' => $this->text,
            // Meme It: the picture to caption, and the credit its licence asks for.
            'image_url' => Prompt::urlFor($this->image),
            'credit' => $this->image === null ? null : $this->prompt?->credit,
            'source_url' => $this->image === null ? null : $this->prompt?->source_url,
            'max_length' => FinishRound::MAX_ANSWER_LENGTH,
            'min_answers' => OpenFinishVoting::MIN_ANSWERS,
            'answered_user_ids' => $this->authorIds(),
            'my_answer' => $viewerId === null ? null : ($answers[$viewerId] ?? null),
            'answers' => $this->voting_started_at === null ? null : array_map(fn (int $authorId, int $position) => [
                'position' => $position,
                'text' => $answers[$authorId] ?? '',
                'mine' => $authorId === $viewerId,
                'user_id' => $ended ? $authorId : null,
                'votes' => $ended ? ($tally[$authorId] ?? 0) : null,
            ], $order, array_keys($order)),
            'voted_user_ids' => array_map('intval', array_keys($votes)),
            'my_vote' => $myVote === false ? null : $myVote,
            'scoring' => ['win' => CloseFinishVoting::WIN_POINTS],
            'started_at' => $this->started_at->toIso8601String(),
            'voting_started_at' => $this->voting_started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'result' => $ended ? [
                'ending' => $this->ending,
                'meaning' => $this->meaning,
                'winner_user_ids' => $this->winner_user_ids ?? [],
            ] : null,
        ];
    }
}
