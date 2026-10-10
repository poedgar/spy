<?php

namespace App\Actions\Phrase;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\PhraseEnding;
use App\Events\GameUpdated;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Notifications\RoundEnded;
use App\Support\BestEffortBroadcast;
use App\Support\GameNews;
use App\Support\PhraseCatalog;
use Illuminate\Support\Facades\DB;

/**
 * Anyone may guess the whole phrase at any time. The first right guess wins
 * the round; a wrong one costs a point and play goes on.
 */
class GuessPhrase
{
    public const WIN_POINTS = 3;

    public const WRONG_GUESS_PENALTY = 1;

    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user, string $guess): bool
    {
        abort_unless($game->hasPlayer($user), 403);
        $game->ensureType(GameType::Phrase);

        $correct = DB::transaction(function () use ($game, $user, $guess): bool {
            $game = $game->freshLocked();

            if ($game->status !== GameStatus::Active) {
                throw new GameRuleException('guess', __('There is no round in progress.'));
            }

            $round = $game->currentPhraseRound()->firstOrFail();
            $correct = PhraseCatalog::matches($round->language, $round->phrase_id, $guess);

            $round->guesses()->create(['user_id' => $user->id, 'guess' => $guess, 'correct' => $correct]);

            $player = GamePlayer::where('game_id', $game->id)->where('user_id', $user->id);

            if (! $correct) {
                $player->decrement('score', self::WRONG_GUESS_PENALTY);

                return false;
            }

            $player->increment('score', self::WIN_POINTS);
            $round->update([
                'ended_at' => now(),
                'ending' => PhraseEnding::Guessed,
                'winner_user_id' => $user->id,
            ]);
            $game->update(['status' => GameStatus::Completed]);
            GameNews::toPlayers($game, new RoundEnded($game, [
                'number' => $round->number,
                'phrase_ending' => PhraseEnding::Guessed->value,
                'winner_codename' => $user->codename,
            ]), $user->id);

            return true;
        });

        BestEffortBroadcast::dispatch(new GameUpdated($game->refresh()));

        return $correct;
    }
}
