<?php

namespace App\Queries;

use App\Enums\AgeTier;
use App\Enums\GameMode;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Enums\InvitationStatus;
use App\Enums\Locale;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

/**
 * @phpstan-type OpenGame array{id: int, code: string, title: string, game_type: GameType, game_mode: GameMode|null, age_tier: AgeTier, phrase_language: Locale|null, player_count: int|null, max_players: int, host_codename: string, my_request: InvitationStatus|null}
 *
 * What a game's home screen lists: the user's games of that type, newest
 * first, and the invitations to them still waiting for an answer.
 */
class GameHomeQuery
{
    /**
     * @return Collection<int, Game>
     */
    public function games(User $user, GameType $type = GameType::Spy): Collection
    {
        return $user
            ->gamePlayers()
            ->whereHas('game', fn ($query) => $query->where('game_type', $type))
            ->with(['game' => fn ($query) => $query->withCount('players')])
            ->get()
            ->pluck('game')
            ->sortByDesc('created_at')
            ->values();
    }

    public const OPEN_GAMES_LIMIT = 30;

    /**
     * Listed games of this type that are recruiting with a free seat and
     * that the user is not already in, newest first. Each row carries the
     * user's own join request status, so the list can show "requested".
     *
     * @return Collection<int, OpenGame>
     */
    public function openGames(User $user, GameType $type = GameType::Spy): Collection
    {
        $games = Game::query()
            ->where('game_type', $type)
            ->where('status', GameStatus::Recruiting)
            ->where('is_listed', true)
            ->whereDoesntHave('players', fn ($query) => $query->where('user_id', $user->id))
            ->withCount('players')
            ->with(['host:id,codename', 'joinRequests' => fn ($query) => $query->where('user_id', $user->id)])
            ->latest()
            ->limit(self::OPEN_GAMES_LIMIT * 2)
            ->get()
            ->filter(fn (Game $game) => $game->players_count < $game->max_players)
            ->take(self::OPEN_GAMES_LIMIT)
            ->values();

        return $games->map(fn (Game $game) => [
            'id' => $game->id,
            'code' => $game->code,
            'title' => $game->title,
            'game_type' => $game->game_type,
            'game_mode' => $game->game_mode,
            'age_tier' => $game->age_tier,
            'phrase_language' => $game->phrase_language,
            'player_count' => $game->players_count,
            'max_players' => $game->max_players,
            'host_codename' => $game->host->codename,
            'my_request' => $game->joinRequests->first()?->status,
        ]);
    }

    /**
     * @return EloquentCollection<int, Invitation>
     */
    public function pendingInvitations(User $user, GameType $type = GameType::Spy): EloquentCollection
    {
        return $user
            ->receivedInvitations()
            ->where('status', InvitationStatus::Pending)
            ->whereHas('game', fn ($query) => $query->where('game_type', $type))
            ->with('game:id,title,code,game_type', 'fromUser:id,codename')
            ->get();
    }
}
