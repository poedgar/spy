<?php

namespace App\Actions\Phrase;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\Locale;
use App\Events\GameUpdated;
use App\Events\RoundStarted;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\PhraseRound;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use App\Support\PhraseCatalog;
use Illuminate\Support\Facades\DB;

/**
 * Deals a phrase: picks one at least as long as the table, gives every
 * player a different word of it (the rest stay hidden) and shuffles the
 * order in which players ask their questions. Scores carry over.
 */
class StartPhraseRound
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host): PhraseRound
    {
        abort_unless($game->isHost($host), 403);
        $game->ensureType(GameType::Phrase);

        $round = DB::transaction(function () use ($game): PhraseRound {
            $game = $game->freshLocked();
            $language = $game->phrase_language ?? Locale::English;

            if ($game->status === GameStatus::Active) {
                throw new GameRuleException('game', __('A round is already in progress.'));
            }

            $playerIds = $game->players()->pluck('user_id')->map(fn ($id) => (int) $id);

            if ($playerIds->count() < Game::MIN_PLAYERS) {
                throw new GameRuleException('game', __('At least :count operatives are required to start.', ['count' => Game::MIN_PLAYERS]));
            }

            $phraseId = PhraseCatalog::randomId(
                $language,
                $playerIds->count(),
                array_values($game->phraseRounds()->pluck('phrase_id')->map(fn ($id) => (int) $id)->all()),
            );

            if ($phraseId === null) {
                throw new GameRuleException('game', __('There is no phrase long enough for :count players.', ['count' => $playerIds->count()]));
            }

            $wordCount = count(PhraseCatalog::words(PhraseCatalog::find($language, $phraseId)['text'] ?? ''));
            $positions = collect(range(0, $wordCount - 1))->shuffle()->take($playerIds->count())->values();

            $round = $game->phraseRounds()->create([
                'number' => ((int) $game->phraseRounds()->max('number')) + 1,
                'language' => $language,
                'phrase_id' => $phraseId,
                'assignments' => $playerIds->values()->combine($positions)->all(),
                'turn_order' => $playerIds->shuffle()->values()->all(),
                'turn_index' => 0,
                'started_at' => now(),
            ]);

            $game->update(['status' => GameStatus::Active]);

            return $round;
        });

        RoundStarted::dispatch($game, $round->number);
        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));

        return $round;
    }
}
