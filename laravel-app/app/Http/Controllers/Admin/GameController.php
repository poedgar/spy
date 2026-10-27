<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\GameUpdated;
use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use App\Support\BestEffortBroadcast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every game, for site administrators: what it is, who hosts and plays
 * it, and how active it is. Read-only.
 */
class GameController extends Controller
{
    public const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::enum(GameType::class)],
            'status' => ['nullable', Rule::in([...array_column(GameStatus::cases(), 'value'), 'abandoned'])],
            'user' => ['nullable', 'integer'],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $player = isset($filters['user']) ? User::whereKey((int) $filters['user'])->first() : null;

        $games = Game::query()
            ->with(['host:id,codename,name', 'players.user:id,codename'])
            ->withCount(['players', 'rounds', 'phraseRounds', 'songRounds', 'finishRounds', 'emotionRounds'])
            ->when(mb_strlen($search) >= 2, function ($query) use ($search) {
                $like = '%'.addcslashes(mb_strtolower($search), '%_\\').'%';
                $query->where(fn ($query) => $query
                    ->whereRaw("lower(title) like ? escape '\\'", [$like])
                    ->orWhereRaw("lower(code) like ? escape '\\'", [$like]));
            })
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('game_type', $type))
            ->when($filters['status'] ?? null, fn ($query, $status) => $status === 'abandoned'
                ? $query->abandoned()
                : $query->where('status', $status))
            ->when($player, fn ($query, User $player) => $query->whereIn('id', GamePlayer::where('user_id', $player->id)->select('game_id')))
            ->latest('updated_at')
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Game $game) => [
                'id' => $game->id,
                'code' => $game->code,
                'title' => $game->title,
                'type' => $game->game_type->value,
                'status' => $game->status->value,
                'host' => $game->host ? ['id' => $game->host->id, 'codename' => $game->host->codename] : null,
                'players' => $game->players->map(fn (GamePlayer $p) => $p->user?->codename)->filter()->values(),
                'players_count' => (int) $game->getAttribute('players_count'),
                'max_players' => $game->max_players,
                'rounds_count' => $rounds = (int) $game->getAttribute('rounds_count') + (int) $game->getAttribute('phrase_rounds_count')
                    + (int) $game->getAttribute('song_rounds_count') + (int) $game->getAttribute('finish_rounds_count') + (int) $game->getAttribute('emotion_rounds_count'),
                'abandoned' => $game->status === GameStatus::Recruiting
                    && $rounds === 0
                    && $game->created_at?->lte(now()->subHours(Game::ABANDONED_AFTER_HOURS)),
                'is_listed' => $game->is_listed,
                'requires_approval' => $game->requires_approval,
                'created_at' => $game->created_at?->toIso8601String(),
                'updated_at' => $game->updated_at?->toIso8601String(),
            ]);

        return inertia('admin/Games', [
            'abandonedAfterHours' => Game::ABANDONED_AFTER_HOURS,
            'games' => $games,
            'filters' => [
                'q' => $search,
                'type' => $filters['type'] ?? null,
                'status' => $filters['status'] ?? null,
                'user' => $player ? ['id' => $player->id, 'codename' => $player->codename] : null,
            ],
            'stats' => [
                'total' => Game::count(),
                'playing' => Game::whereIn('status', [GameStatus::Active, GameStatus::Voting])->count(),
                'recruiting' => Game::where('status', GameStatus::Recruiting)->count(),
                'new_this_week' => Game::where('created_at', '>=', now()->subWeek())->count(),
                'abandoned' => Game::abandoned()->count(),
            ],
        ]);
    }

    /** Removes one abandoned game; anything still in play is refused. */
    public function destroy(Game $game): RedirectResponse
    {
        if (! Game::abandoned()->whereKey($game->id)->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Only abandoned games can be removed.')]);

            return back();
        }

        $this->remove($game);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Game removed.')]);

        return back();
    }

    /** Removes every abandoned game at once. */
    public function destroyAbandoned(): RedirectResponse
    {
        $games = Game::abandoned()->get();
        $games->each(fn (Game $game) => $this->remove($game));
        Inertia::flash('toast', ['type' => 'success', 'message' => trans_choice(':count abandoned game removed.|:count abandoned games removed.', $games->count())]);

        return back();
    }

    /**
     * Like a host closing it, minus the notifications: nobody was playing.
     * Its rounds, invitations, requests and chat go with it.
     */
    private function remove(Game $game): void
    {
        BestEffortBroadcast::dispatch(new GameUpdated($game));
        $game->delete();
    }
}
