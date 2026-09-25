# Mobile API Backend (Plan A of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `laravel-app` a token-authenticated, versioned JSON API (plus live lobby broadcasts and Expo push delivery) that the Expo app in Plan B consumes, without changing any existing web behaviour.

**Architecture:** Business rules move out of the Inertia controllers into single-purpose Action classes that throw a self-rendering `GameRuleException` (422 JSON for API requests, `back()->withErrors()` for web). Existing web controllers and new `App\Http\Controllers\Api\*` controllers both call the Actions. Sanctum personal access tokens authenticate the API; a new `PlayerJoined` broadcast drives live lobbies; a queued listener sends invitation pushes through Expo's push HTTP API.

**Tech Stack:** Laravel 13, PHP 8.5, Fortify, Laravel Sanctum 4, Pusher broadcasting, Pest 5, SQLite, Vue 3 + Inertia (one small composable).

**Spec:** `docs/superpowers/specs/2026-09-25-expo-mobile-app-design.md` (Part 1 — Backend). Plan B (`2026-09-25-expo-mobile-app.md`) covers Part 2.

## Global Constraints

- All commands run from `laravel-app/` unless stated otherwise.
- API routes live under `/api/v1`; token broadcast auth lives at `/api/broadcasting/auth`.
- API auth is Sanctum personal access tokens; web session auth (Fortify) must remain untouched.
- Web behaviour must be unchanged: every existing test in `tests/Feature` and the Cypress specs `01`–`03` keep passing without edits.
- Rule-violation messages are the existing strings, verbatim: `This operation roster is already full.`, `You cannot invite yourself.`, `That operative is already in this operation.`, `This invitation is no longer available.`, `This operation is no longer recruiting.`, `No operation found with that invite code.`
- `secret_location` is never serialized by any API response.
- API status codes: 401 unauthenticated, 403 unauthorized, 404 not found, 422 validation or `GameRuleException`, 429 throttled.
- Login, 2FA and password-change endpoints use `throttle:6,1`.
- 2FA challenges live 5 minutes in the cache.
- API resources are returned without a `data` wrapper (`JsonResource::withoutWrapping()`).
- Broadcasts are best-effort: a broadcast failure is reported, never fails the request.
- Code style: `composer lint:check` (Pint) and PHPStan (`./vendor/bin/phpstan analyse`) must pass at the end.
- Commit messages follow the repo's plain-sentence style and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Lowercase or unknown invite code via the API** — expect 404 (codes are case-sensitive, as on web), never a 500. Pinned in Task 7.
- **`PlayerJoined` payload broadcast to every roster member** — must never contain the joiner's email. Pinned in Task 3.
- **A token after logout** — must no longer authenticate (401), even though the push-token cascade already ran. Pinned in Task 4.
- **Reusing a consumed 2FA recovery code** — must be rejected. Pinned in Task 5.
- **The same Expo push token registered by a second account on a shared device** — must be reassigned to the new user, not fail on the unique index. Pinned in Task 10.

---

### Task 1: `GameRuleException`, game Actions, and the refactored web `GameController`

**Files:**
- Create: `app/Exceptions/GameRuleException.php`
- Create: `app/Support/BestEffortBroadcast.php`
- Create: `app/Actions/Games/CreateGame.php`
- Create: `app/Actions/Games/JoinGame.php`
- Modify: `app/Http/Controllers/GameController.php` (whole file)
- Modify: `bootstrap/app.php` (`withExceptions` block)
- Test: `tests/Feature/Actions/GameActionsTest.php`

**Interfaces:**
- Produces:
  - `App\Exceptions\GameRuleException(string $field, string $message)` with public readonly `$field`; renders 422 `{message, errors: {field: [message]}}` for `api/*` or JSON-expecting requests, else `back()->withErrors([$field => $message])`.
  - `App\Support\BestEffortBroadcast::dispatch(object $event): void`
  - `App\Actions\Games\CreateGame::handle(User $host, array $attributes): Game` — `$attributes` keys `title`, `game_mode`, `max_players`, `mission_briefing`.
  - `App\Actions\Games\JoinGame::handle(Game $game, User $user): Game` — throws `GameRuleException('code', 'This operation roster is already full.')`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Actions/GameActionsTest.php`:

```php
<?php

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('CreateGame creates the game and the host roster row', function () {
    $host = User::factory()->create();

    $game = app(CreateGame::class)->handle($host, [
        'title' => 'Op Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole.',
    ]);

    expect($game->code)->toMatch('/^SPY-[A-Z2-9]{4}$/')
        ->and($game->game_type)->toBe('spy')
        ->and($game->host_id)->toBe($host->id)
        ->and($game->secret_location)->not->toBeEmpty();

    $player = GamePlayer::where('game_id', $game->id)->sole();
    expect($player->user_id)->toBe($host->id)
        ->and($player->is_host)->toBeTrue()
        ->and($player->status)->toBe('ready');
});

test('JoinGame adds the user to the roster', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    app(JoinGame::class)->handle($game, $user);

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeTrue();
});

test('JoinGame is a no-op for a user already on the roster', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    app(JoinGame::class)->handle($game, $user);

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('JoinGame rejects a full roster with a code-field rule exception', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);

    try {
        app(JoinGame::class)->handle($game, User::factory()->create());
        $this->fail('Expected GameRuleException');
    } catch (GameRuleException $e) {
        expect($e->field)->toBe('code')
            ->and($e->getMessage())->toBe('This operation roster is already full.');
    }
});

test('GameRuleException renders as a 422 validation body for API requests', function () {
    $request = Illuminate\Http\Request::create('/api/v1/anything', 'POST');

    $response = (new GameRuleException('code', 'Nope.'))->render($request);

    expect($response->getStatusCode())->toBe(422)
        ->and($response->getData(true))->toBe([
            'message' => 'Nope.',
            'errors' => ['code' => ['Nope.']],
        ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Actions/GameActionsTest.php`
Expected: FAIL — `Class "App\Actions\Games\CreateGame" not found`.

- [ ] **Step 3: Write the exception, broadcast helper and Actions**

`app/Exceptions/GameRuleException.php`:

```php
<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * A game rule was violated (full roster, stale invitation, ...). Renders the
 * way each client expects: a validation-shaped 422 for the JSON API, and a
 * flashed field error for the Inertia web app — so Actions can throw it
 * without knowing which client called them.
 */
class GameRuleException extends Exception
{
    public function __construct(
        public readonly string $field,
        string $message,
    ) {
        parent::__construct($message);
    }

    public function render(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'message' => $this->getMessage(),
                'errors' => [$this->field => [$this->getMessage()]],
            ], 422);
        }

        return back()->withErrors([$this->field => $this->getMessage()]);
    }
}
```

`app/Support/BestEffortBroadcast.php`:

```php
<?php

namespace App\Support;

use Throwable;

class BestEffortBroadcast
{
    /**
     * The state change that triggered the event is already saved at this
     * point — a broadcast failure (e.g. Pusher unreachable, misconfigured, or
     * a network/TLS error) is a best-effort delivery problem, not a reason to
     * fail the whole request. Pusher's SDK only wraps API-level errors (bad
     * credentials, rate limits) in BroadcastException; raw connectivity
     * failures surface as GuzzleHttp exceptions instead, so this catches
     * broadly.
     */
    public static function dispatch(object $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
```

`app/Actions/Games/CreateGame.php`:

```php
<?php

namespace App\Actions\Games;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class CreateGame
{
    /**
     * @param  array{title: string, game_mode: string, max_players: int, mission_briefing: string}  $attributes
     */
    public function handle(User $host, array $attributes): Game
    {
        return DB::transaction(function () use ($host, $attributes) {
            $game = Game::create([
                ...$attributes,
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
                'host_id' => $host->id,
                'game_type' => 'spy',
            ]);

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $host->id,
                'is_host' => true,
                'status' => 'ready',
                'joined_at' => now(),
            ]);

            return $game;
        });
    }
}
```

`app/Actions/Games/JoinGame.php`:

```php
<?php

namespace App\Actions\Games;

use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

class JoinGame
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $user): Game
    {
        if ($game->players()->where('user_id', $user->id)->exists()) {
            return $game;
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('code', 'This operation roster is already full.');
        }

        GamePlayer::create([
            'game_id' => $game->id,
            'user_id' => $user->id,
            'is_host' => false,
            'status' => 'ready',
            'joined_at' => now(),
        ]);

        return $game;
    }
}
```

- [ ] **Step 4: Stop reporting rule violations as errors**

In `bootstrap/app.php`, add the import and extend the `withExceptions` closure:

```php
use App\Exceptions\GameRuleException;
```

```php
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport(GameRuleException::class);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
```

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `php artisan test tests/Feature/Actions/GameActionsTest.php`
Expected: PASS (5 tests).

- [ ] **Step 6: Refactor the web `GameController` onto the Actions**

Replace `app/Http/Controllers/GameController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Http\Requests\StoreGameRequest;
use App\Models\Game;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class GameController extends Controller
{
    public function show(Game $game): Response
    {
        $game->load([
            'players' => fn ($query) => $query->with('user:id,name,codename'),
            'host:id,name,codename',
        ]);

        return inertia('games/Lobby', [
            'game' => $game->makeHidden('secret_location'),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): RedirectResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return to_route('games.show', $game);
    }

    public function join(Request $request, string $code, JoinGame $joinGame): RedirectResponse
    {
        $game = Game::where('code', $code)->first();

        if (! $game) {
            return back()->withErrors(['code' => 'No operation found with that invite code.']);
        }

        $joinGame->handle($game, $request->user());

        return to_route('games.show', $game);
    }
}
```

- [ ] **Step 7: Run the existing web game tests to prove behaviour is unchanged**

Run: `php artisan test tests/Feature/GameCreationTest.php tests/Feature/GameJoinTest.php tests/Feature/GameLobbyTest.php tests/Feature/Actions`
Expected: PASS, with no edits to the existing test files.

- [ ] **Step 8: Commit**

```bash
git add app/Exceptions app/Support/BestEffortBroadcast.php app/Actions/Games app/Http/Controllers/GameController.php bootstrap/app.php tests/Feature/Actions
git commit -m "Extract game creation and joining into shared Actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Invitation Actions, shared queries, and the refactored web controllers

**Files:**
- Create: `app/Actions/Invitations/SendInvitation.php`
- Create: `app/Actions/Invitations/AcceptInvitation.php`
- Create: `app/Actions/Invitations/DeclineInvitation.php`
- Create: `app/Queries/SpyHomeQuery.php`
- Create: `app/Queries/InvitableUsersQuery.php`
- Modify: `app/Http/Controllers/InvitationController.php` (whole file)
- Modify: `app/Http/Controllers/DashboardController.php` (`spy()` method)
- Test: `tests/Feature/Actions/InvitationActionsTest.php`

**Interfaces:**
- Consumes: `GameRuleException`, `BestEffortBroadcast::dispatch()` (Task 1).
- Produces:
  - `SendInvitation::handle(Game $game, User $host, int $toUserId): Invitation` — aborts 403 unless host and recruiting.
  - `AcceptInvitation::handle(Invitation $invitation, User $user): Game` — aborts 403 unless recipient.
  - `DeclineInvitation::handle(Invitation $invitation, User $user): void` — aborts 403 unless recipient.
  - `SpyHomeQuery::games(User $user): Illuminate\Support\Collection<int, Game>`
  - `SpyHomeQuery::pendingInvitations(User $user): Illuminate\Database\Eloquent\Collection<int, Invitation>` (with `game:id,title,code` and `fromUser:id,codename` loaded)
  - `InvitableUsersQuery::for(Game $game, User $host): Illuminate\Support\Collection<int, array{id: int, name: string, codename: string, invite_status: 'pending'|null}>`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Actions/InvitationActionsTest.php`:

```php
<?php

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Events\InvitationSent;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use App\Queries\InvitableUsersQuery;
use App\Queries\SpyHomeQuery;
use Illuminate\Support\Facades\Event;
use Symfony\Component\HttpKernel\Exception\HttpException;

function hostedGame(array $attributes = []): array
{
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6, ...$attributes]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    return [$host, $game];
}

function expectRuleViolation(callable $callback, string $field, string $message): void
{
    try {
        $callback();
        test()->fail('Expected GameRuleException');
    } catch (GameRuleException $e) {
        expect($e->field)->toBe($field)->and($e->getMessage())->toBe($message);
    }
}

test('SendInvitation creates a pending invitation and dispatches InvitationSent', function () {
    Event::fake([InvitationSent::class]);
    [$host, $game] = hostedGame();
    $invitee = User::factory()->create();

    $invitation = app(SendInvitation::class)->handle($game, $host, $invitee->id);

    expect($invitation->status)->toBe('pending');
    Event::assertDispatched(InvitationSent::class);
});

test('SendInvitation enforces every existing rule', function () {
    Event::fake([InvitationSent::class]);
    [$host, $game] = hostedGame(['max_players' => 2]);
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);

    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, $host->id), 'to_user_id', 'You cannot invite yourself.');
    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, $member->id), 'to_user_id', 'That operative is already in this operation.');
    expectRuleViolation(fn () => app(SendInvitation::class)->handle($game, $host, User::factory()->create()->id), 'to_user_id', 'This operation roster is already full.');
});

test('SendInvitation aborts 403 for a non-host', function () {
    [, $game] = hostedGame();

    app(SendInvitation::class)->handle($game, User::factory()->create(), User::factory()->create()->id);
})->throws(HttpException::class);

test('AcceptInvitation joins the game and marks the invitation accepted', function () {
    [, $game] = hostedGame();
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $result = app(AcceptInvitation::class)->handle($invitation, $recipient);

    expect($result->is($game))->toBeTrue()
        ->and($invitation->fresh()->status)->toBe('accepted')
        ->and(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeTrue();
});

test('AcceptInvitation rejects stale, non-recruiting and full cases', function () {
    [, $game] = hostedGame(['max_players' => 1]);
    $recipient = User::factory()->create();

    $declined = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id, 'status' => 'declined']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined, $recipient), 'invitation', 'This invitation is no longer available.');

    $declined->update(['status' => 'pending']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined, $recipient), 'invitation', 'This operation roster is already full.');

    $game->update(['status' => 'active']);
    expectRuleViolation(fn () => app(AcceptInvitation::class)->handle($declined->fresh(), $recipient), 'invitation', 'This operation is no longer recruiting.');
});

test('AcceptInvitation aborts 403 for anyone but the recipient', function () {
    $invitation = Invitation::factory()->create();

    app(AcceptInvitation::class)->handle($invitation, User::factory()->create());
})->throws(HttpException::class);

test('DeclineInvitation marks a pending invitation declined', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    app(DeclineInvitation::class)->handle($invitation, $recipient);

    expect($invitation->fresh()->status)->toBe('declined');
});

test('SpyHomeQuery returns the users spy games and pending invitations only', function () {
    [$host, $game] = hostedGame();
    $otherGame = Game::factory()->create(['game_type' => 'other']);
    GamePlayer::factory()->create(['game_id' => $otherGame->id, 'user_id' => $host->id]);
    Invitation::factory()->create(['to_user_id' => $host->id, 'status' => 'pending']);
    Invitation::factory()->create(['to_user_id' => $host->id, 'status' => 'declined']);

    $query = app(SpyHomeQuery::class);

    expect($query->games($host)->pluck('id')->all())->toBe([$game->id])
        ->and($query->pendingInvitations($host))->toHaveCount(1)
        ->and($query->pendingInvitations($host)->first()->relationLoaded('fromUser'))->toBeTrue();
});

test('InvitableUsersQuery excludes the host and roster and flags pending invitations', function () {
    [$host, $game] = hostedGame();
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);
    $invited = User::factory()->create(['name' => 'Alpha']);
    $free = User::factory()->create(['name' => 'Bravo']);
    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $invited->id, 'status' => 'pending']);

    $rows = app(InvitableUsersQuery::class)->for($game, $host);

    expect($rows->pluck('id')->all())->toBe([$invited->id, $free->id])
        ->and($rows->firstWhere('id', $invited->id)['invite_status'])->toBe('pending')
        ->and($rows->firstWhere('id', $free->id)['invite_status'])->toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Actions/InvitationActionsTest.php`
Expected: FAIL — `Class "App\Actions\Invitations\SendInvitation" not found`.

- [ ] **Step 3: Write the Actions**

`app/Actions/Invitations/SendInvitation.php`:

```php
<?php

namespace App\Actions\Invitations;

use App\Events\InvitationSent;
use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use App\Support\BestEffortBroadcast;

class SendInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Game $game, User $host, int $toUserId): Invitation
    {
        abort_unless($game->host_id === $host->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        if ($toUserId === $host->id) {
            throw new GameRuleException('to_user_id', 'You cannot invite yourself.');
        }

        if ($game->players()->where('user_id', $toUserId)->exists()) {
            throw new GameRuleException('to_user_id', 'That operative is already in this operation.');
        }

        if ($game->players()->count() >= $game->max_players) {
            throw new GameRuleException('to_user_id', 'This operation roster is already full.');
        }

        $invitation = Invitation::updateOrCreate(
            ['game_id' => $game->id, 'to_user_id' => $toUserId],
            ['from_user_id' => $host->id, 'status' => 'pending'],
        );

        BestEffortBroadcast::dispatch(new InvitationSent($invitation));

        return $invitation;
    }
}
```

`app/Actions/Invitations/AcceptInvitation.php`:

```php
<?php

namespace App\Actions\Invitations;

use App\Exceptions\GameRuleException;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AcceptInvitation
{
    /**
     * @throws GameRuleException
     */
    public function handle(Invitation $invitation, User $user): Game
    {
        abort_unless($invitation->to_user_id === $user->id, 403);

        if ($invitation->status !== 'pending') {
            throw new GameRuleException('invitation', 'This invitation is no longer available.');
        }

        $game = $invitation->game;

        if ($game->status !== 'recruiting') {
            throw new GameRuleException('invitation', 'This operation is no longer recruiting.');
        }

        // Mirrors JoinGame's already-joined guard: a user who joined by code
        // after being invited should have their invitation resolved
        // gracefully, not hit the game_players unique constraint.
        $alreadyJoined = $game->players()->where('user_id', $user->id)->exists();

        if (! $alreadyJoined && $game->players()->count() >= $game->max_players) {
            throw new GameRuleException('invitation', 'This operation roster is already full.');
        }

        DB::transaction(function () use ($alreadyJoined, $game, $user, $invitation): void {
            if (! $alreadyJoined) {
                GamePlayer::create([
                    'game_id' => $game->id,
                    'user_id' => $user->id,
                    'is_host' => false,
                    'status' => 'ready',
                    'joined_at' => now(),
                ]);
            }

            $invitation->update(['status' => 'accepted']);
        });

        return $game;
    }
}
```

`app/Actions/Invitations/DeclineInvitation.php`:

```php
<?php

namespace App\Actions\Invitations;

use App\Models\Invitation;
use App\Models\User;

class DeclineInvitation
{
    public function handle(Invitation $invitation, User $user): void
    {
        abort_unless($invitation->to_user_id === $user->id, 403);

        if ($invitation->status === 'pending') {
            $invitation->update(['status' => 'declined']);
        }
    }
}
```

- [ ] **Step 4: Write the queries (logic moved verbatim from the controllers)**

`app/Queries/SpyHomeQuery.php`:

```php
<?php

namespace App\Queries;

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class SpyHomeQuery
{
    /**
     * @return Collection<int, Game>
     */
    public function games(User $user): Collection
    {
        return $user
            ->gamePlayers()
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();
    }

    /**
     * @return EloquentCollection<int, Invitation>
     */
    public function pendingInvitations(User $user): EloquentCollection
    {
        return $user
            ->receivedInvitations()
            ->where('status', 'pending')
            ->whereHas('game', fn ($query) => $query->where('game_type', 'spy'))
            ->with('game:id,title,code', 'fromUser:id,codename')
            ->get();
    }
}
```

`app/Queries/InvitableUsersQuery.php`:

```php
<?php

namespace App\Queries;

use App\Models\Game;
use App\Models\User;
use Illuminate\Support\Collection;

class InvitableUsersQuery
{
    /**
     * Everyone except the host and the current roster, alphabetical, each
     * flagged 'pending' only when a pending invitation exists (a declined
     * row is free to re-invite, so it surfaces as null).
     *
     * @return Collection<int, array{id: int, name: string, codename: string, invite_status: 'pending'|null}>
     */
    public function for(Game $game, User $host): Collection
    {
        $rosterUserIds = $game->players()->pluck('user_id');
        $pendingInviteeIds = $game->invitations()->where('status', 'pending')->pluck('to_user_id');

        return User::query()
            ->where('id', '!=', $host->id)
            ->whereNotIn('id', $rosterUserIds)
            ->orderBy('name')
            ->get(['id', 'name', 'codename'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'invite_status' => $pendingInviteeIds->contains($user->id) ? 'pending' : null,
            ]);
    }
}
```

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `php artisan test tests/Feature/Actions/InvitationActionsTest.php`
Expected: PASS (9 tests).

- [ ] **Step 6: Refactor the web controllers**

Replace `app/Http/Controllers/InvitationController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Models\Game;
use App\Models\Invitation;
use App\Queries\InvitableUsersQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class InvitationController extends Controller
{
    public function index(Request $request, Game $game, InvitableUsersQuery $invitableUsers): Response
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        return inertia('games/InviteUsers', [
            'game' => $game->only(['id', 'code', 'title']),
            'users' => $invitableUsers->for($game, $request->user()),
        ]);
    }

    public function store(Request $request, Game $game, SendInvitation $sendInvitation): RedirectResponse
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $sendInvitation->handle($game, $request->user(), (int) $validated['to_user_id']);

        return back();
    }

    public function accept(Request $request, Invitation $invitation, AcceptInvitation $acceptInvitation): RedirectResponse
    {
        $game = $acceptInvitation->handle($invitation, $request->user());

        return to_route('games.show', $game);
    }

    public function decline(Request $request, Invitation $invitation, DeclineInvitation $declineInvitation): RedirectResponse
    {
        $declineInvitation->handle($invitation, $request->user());

        return to_route('games.spy');
    }
}
```

(`store` keeps its own host/recruiting checks before validation, exactly as today, so a non-host with an invalid payload still gets 403, not a validation error.)

In `app/Http/Controllers/DashboardController.php`, replace the `spy()` method and add the import:

```php
use App\Queries\SpyHomeQuery;
```

```php
    public function spy(Request $request, SpyHomeQuery $spyHome): Response
    {
        $pendingInvitations = $spyHome->pendingInvitations($request->user())
            ->map(fn (Invitation $invitation) => [
                'id' => $invitation->id,
                'game_title' => $invitation->game->title,
                'game_code' => $invitation->game->code,
                'from_codename' => $invitation->fromUser->codename,
            ]);

        return inertia('games/Spy', [
            'games' => $spyHome->games($request->user()),
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
```

- [ ] **Step 7: Run the whole existing suite to prove web behaviour is unchanged**

Run: `php artisan test`
Expected: PASS, with no edits to any pre-existing test file.

- [ ] **Step 8: Commit**

```bash
git add app/Actions/Invitations app/Queries app/Http/Controllers/InvitationController.php app/Http/Controllers/DashboardController.php tests/Feature/Actions/InvitationActionsTest.php
git commit -m "Extract invitation rules and spy home queries into shared classes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `PlayerJoined` broadcast, `game.{gameId}` channel, and the live web lobby

**Files:**
- Create: `app/Events/PlayerJoined.php`
- Modify: `routes/channels.php` (append a channel)
- Modify: `app/Actions/Games/JoinGame.php` (dispatch after insert)
- Modify: `app/Actions/Invitations/AcceptInvitation.php` (dispatch after commit)
- Create: `resources/js/composables/useGameChannel.ts`
- Modify: `resources/js/pages/games/Lobby.vue` (script block)
- Test: `tests/Feature/Events/PlayerJoinedTest.php`, `tests/Feature/BroadcastingChannelsTest.php` (append)

**Interfaces:**
- Consumes: `BestEffortBroadcast::dispatch()`, `JoinGame`, `AcceptInvitation`.
- Produces: event `App\Events\PlayerJoined(GamePlayer $player)` broadcasting as `player.joined` on `private-game.{game_id}` with payload `{ player: { id, user: { id, name, codename }, is_host, status, joined_at }, player_count }`. Plan B's lobby listens for exactly this.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Events/PlayerJoinedTest.php`:

```php
<?php

use App\Actions\Games\JoinGame;
use App\Actions\Invitations\AcceptInvitation;
use App\Events\PlayerJoined;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('PlayerJoined broadcasts on the games private channel with a safe payload', function () {
    $game = Game::factory()->create();
    $user = User::factory()->create(['email' => 'secret@example.com']);
    $player = GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    $event = new PlayerJoined($player);

    expect($event->broadcastOn()[0]->name)->toBe('private-game.'.$game->id)
        ->and($event->broadcastAs())->toBe('player.joined');

    $payload = $event->broadcastWith();
    expect($payload['player_count'])->toBe(1)
        ->and($payload['player']['user'])->toBe(['id' => $user->id, 'name' => $user->name, 'codename' => $user->codename])
        ->and(json_encode($payload))->not->toContain('secret@example.com');
});

test('joining a game dispatches PlayerJoined once, and not for the already-joined no-op', function () {
    Event::fake([PlayerJoined::class]);
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    app(JoinGame::class)->handle($game, $user);
    app(JoinGame::class)->handle($game, $user);

    Event::assertDispatchedTimes(PlayerJoined::class, 1);
});

test('accepting an invitation dispatches PlayerJoined, but not when already on the roster', function () {
    Event::fake([PlayerJoined::class]);
    $game = Game::factory()->create(['max_players' => 6]);
    $newcomer = User::factory()->create();
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);

    app(AcceptInvitation::class)->handle(
        Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $newcomer->id]), $newcomer);
    app(AcceptInvitation::class)->handle(
        Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $member->id]), $member);

    Event::assertDispatchedTimes(PlayerJoined::class, 1);
});
```

Append to `tests/Feature/BroadcastingChannelsTest.php`:

```php
test('a roster member can authorize their games private channel', function () {
    $user = User::factory()->create();
    $game = \App\Models\Game::factory()->create();
    \App\Models\GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'private-game.'.$game->id,
        'socket_id' => '1234.5678',
    ]);

    $response->assertOk();
});

test('a non-member cannot authorize a games private channel', function () {
    $game = \App\Models\Game::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post('/broadcasting/auth', [
        'channel_name' => 'private-game.'.$game->id,
        'socket_id' => '1234.5678',
    ]);

    $response->assertForbidden();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Events/PlayerJoinedTest.php tests/Feature/BroadcastingChannelsTest.php`
Expected: FAIL — `Class "App\Events\PlayerJoined" not found`, and the channel tests 403 for the member.

- [ ] **Step 3: Write the event**

`app/Events/PlayerJoined.php`:

```php
<?php

namespace App\Events;

use App\Models\GamePlayer;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerJoined implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public GamePlayer $player,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('game.'.$this->player->game_id),
        ];
    }

    /**
     * Built by hand rather than via an API Resource: this goes to every
     * roster member, so it must never include the joiner's email.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->player->loadMissing('user');

        return [
            'player' => [
                'id' => $this->player->id,
                'user' => [
                    'id' => $this->player->user->id,
                    'name' => $this->player->user->name,
                    'codename' => $this->player->user->codename,
                ],
                'is_host' => $this->player->is_host,
                'status' => $this->player->status,
                'joined_at' => $this->player->joined_at?->toIso8601String(),
            ],
            'player_count' => GamePlayer::where('game_id', $this->player->game_id)->count(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'player.joined';
    }
}
```

- [ ] **Step 4: Authorize the channel**

Append to `routes/channels.php` (add `use App\Models\GamePlayer;` to the imports). The parameter is a plain id, not a bound `Game`, because `Game`'s route key is `code`:

```php
Broadcast::channel('game.{gameId}', function (User $user, int $gameId): bool {
    return GamePlayer::where('game_id', $gameId)->where('user_id', $user->id)->exists();
});
```

- [ ] **Step 5: Dispatch from the Actions**

In `app/Actions/Games/JoinGame.php`, add imports `use App\Events\PlayerJoined;` and `use App\Support\BestEffortBroadcast;`, and replace the `GamePlayer::create([...]);` statement with:

```php
        $player = GamePlayer::create([
            'game_id' => $game->id,
            'user_id' => $user->id,
            'is_host' => false,
            'status' => 'ready',
            'joined_at' => now(),
        ]);

        BestEffortBroadcast::dispatch(new PlayerJoined($player));
```

In `app/Actions/Invitations/AcceptInvitation.php`, add the same two imports and replace the `DB::transaction(...)` call with:

```php
        $player = DB::transaction(function () use ($alreadyJoined, $game, $user, $invitation): ?GamePlayer {
            $player = null;

            if (! $alreadyJoined) {
                $player = GamePlayer::create([
                    'game_id' => $game->id,
                    'user_id' => $user->id,
                    'is_host' => false,
                    'status' => 'ready',
                    'joined_at' => now(),
                ]);
            }

            $invitation->update(['status' => 'accepted']);

            return $player;
        });

        if ($player) {
            BestEffortBroadcast::dispatch(new PlayerJoined($player));
        }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Events tests/Feature/BroadcastingChannelsTest.php tests/Feature/Actions tests/Feature/GameJoinTest.php tests/Feature/InvitationAcceptTest.php`
Expected: PASS.

- [ ] **Step 7: Make the web lobby live**

Create `resources/js/composables/useGameChannel.ts`:

```ts
import { router } from '@inertiajs/vue3';
import { onBeforeUnmount, onMounted } from 'vue';
import echo from '@/echo';

export function useGameChannel(gameId: number): void {
    onMounted(() => {
        echo.private(`game.${gameId}`).listen('.player.joined', () => {
            router.reload({ only: ['game'] });
        });
    });

    onBeforeUnmount(() => {
        echo.leave(`game.${gameId}`);
    });
}
```

In `resources/js/pages/games/Lobby.vue`'s `<script setup>`, add the import next to the others and the call after `isHost`:

```ts
import { useGameChannel } from '@/composables/useGameChannel';
```

```ts
useGameChannel(props.game.id);
```

- [ ] **Step 8: Check the frontend**

Run: `npm run types:check && npm run check`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add app/Events/PlayerJoined.php routes/channels.php app/Actions resources/js/composables/useGameChannel.ts resources/js/pages/games/Lobby.vue tests/Feature/Events/PlayerJoinedTest.php tests/Feature/BroadcastingChannelsTest.php
git commit -m "Broadcast PlayerJoined on a per-game channel and refresh the web lobby live

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Manual check, not automated — needs real Pusher credentials: open one lobby in two browsers as the host and a second user joining by code; the host's roster updates without a reload.)

---

### Task 4: Sanctum, the `/api/v1` skeleton, and register / login / logout / me

**Files:**
- Run: `php artisan install:api --without-migration-prompt` (adds `laravel/sanctum`, `config/sanctum.php`, the `personal_access_tokens` migration, `routes/api.php`, and the `api:` entry in `bootstrap/app.php`)
- Modify: `app/Models/User.php` (add `HasApiTokens`, `pushTokens()` comes in Task 10)
- Modify: `app/Providers/AppServiceProvider.php` (`withoutWrapping`)
- Create: `app/Http/Resources/UserResource.php`
- Create: `app/Http/Controllers/Api/AuthController.php`
- Create: `app/Http/Controllers/Api/MeController.php`
- Replace: `routes/api.php`
- Test: `tests/Feature/Api/AuthTest.php`

**Interfaces:**
- Produces:
  - `POST /api/v1/auth/register` → `201 { token: string, user: UserResource }`
  - `POST /api/v1/auth/login` → `200 { token, user }` or `200 { two_factor: true, challenge: string }` (the 2FA branch is completed in Task 5)
  - `POST /api/v1/auth/logout` → `204`
  - `GET /api/v1/me` → `UserResource`
  - `UserResource` → `{ id, name, codename, email? }` (`email` only when the resource is the authenticated user)
  - `AuthController::issueToken(User $user, string $deviceName): JsonResponse` (protected; reused by Task 5)

- [ ] **Step 1: Install Sanctum**

Run: `php artisan install:api --without-migration-prompt`
Expected: `routes/api.php` and a `database/migrations/*_create_personal_access_tokens_table.php` exist; `bootstrap/app.php`'s `withRouting` now has an `api:` line.

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/Api/AuthTest.php`:

```php
<?php

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

test('register creates a user with a codename and returns a token', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'device_name' => 'iPhone',
    ]);

    $response->assertCreated()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'codename', 'email']])
        ->assertJsonPath('user.email', 'ada@example.com');

    expect(User::where('email', 'ada@example.com')->first()->codename)->not->toBeEmpty();
});

test('register validates input', function () {
    $this->postJson('/api/v1/auth/register', ['device_name' => 'iPhone'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'password']);
});

test('login returns a token for valid credentials', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'Pixel',
    ])->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'codename']]);

    expect(PersonalAccessToken::where('name', 'Pixel')->count())->toBe(1);
});

test('login rejects a wrong password on the email field', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrong',
        'device_name' => 'Pixel',
    ])->assertUnprocessable()->assertJsonValidationErrors(['email']);
});

test('me returns the authenticated user including email', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJson(['id' => $user->id, 'email' => $user->email, 'codename' => $user->codename]);
});

test('me requires a token', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('logout revokes the current token so it no longer authenticates', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PersonalAccessToken::count())->toBe(0);

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `php artisan test tests/Feature/Api/AuthTest.php`
Expected: FAIL — 404s on `/api/v1/...`.

- [ ] **Step 4: Add `HasApiTokens` and unwrap resources**

In `app/Models/User.php` add `use Laravel\Sanctum\HasApiTokens;` and extend the trait list:

```php
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;
```

In `app/Providers/AppServiceProvider.php` add `use Illuminate\Http\Resources\Json\JsonResource;` and, at the top of `configureDefaults()`:

```php
        JsonResource::withoutWrapping();
```

- [ ] **Step 5: Write the resource and controllers**

`app/Http/Resources/UserResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'codename' => $this->codename,
            'email' => $this->when($request->user()?->id === $this->id, $this->email),
        ];
    }
}
```

`app/Http/Controllers/Api/AuthController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class AuthController extends Controller
{
    public function register(Request $request, CreatesNewUsers $creator): JsonResponse
    {
        $request->validate(['device_name' => ['required', 'string', 'max:255']]);

        $user = $creator->create($request->only(['name', 'email', 'password', 'password_confirmation']));

        return $this->issueToken($user, (string) $request->input('device_name'))->setStatusCode(201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => [__('auth.failed')]]);
        }

        return $this->issueToken($user, $credentials['device_name']);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    protected function issueToken(User $user, string $deviceName): JsonResponse
    {
        Auth::setUser($user);

        return response()->json([
            'token' => $user->createToken($deviceName)->plainTextToken,
            'user' => UserResource::make($user),
        ]);
    }
}
```

(`Auth::setUser` makes `UserResource` see the new user as the requester, so the token response includes their own email.)

`app/Http/Controllers/Api/MeController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }
}
```

- [ ] **Step 6: Write the routes**

Replace `routes/api.php` with:

```php
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me', [MeController::class, 'show']);
    });
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Api/AuthTest.php`
Expected: PASS (7 tests).

- [ ] **Step 8: Run the full suite (Sanctum must not disturb web auth)**

Run: `php artisan test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add composer.json composer.lock config/sanctum.php database/migrations routes/api.php bootstrap/app.php app/Models/User.php app/Providers/AppServiceProvider.php app/Http/Resources/UserResource.php app/Http/Controllers/Api tests/Feature/Api/AuthTest.php
git commit -m "Add Sanctum token auth and the /api/v1 register, login, logout and me endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The 2FA login challenge and forgot-password

**Files:**
- Modify: `app/Http/Controllers/Api/AuthController.php` (`login` branch, new `twoFactor`, `forgotPassword`)
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/TwoFactorLoginTest.php`, `tests/Feature/Api/ForgotPasswordTest.php`

**Interfaces:**
- Consumes: `AuthController::issueToken()` (Task 4).
- Produces:
  - `POST /api/v1/auth/login` for a 2FA user → `200 { two_factor: true, challenge }`, no token.
  - `POST /api/v1/auth/two-factor` `{ challenge, code | recovery_code }` → `{ token, user }`; 422 on `challenge` (unknown/expired) or `code` (wrong code / recovery code).
  - `POST /api/v1/auth/forgot-password` `{ email }` → `200 { message }`, identical for known and unknown emails.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Api/TwoFactorLoginTest.php`:

```php
<?php

use App\Models\User;
use Laravel\Fortify\TwoFactorAuthenticationProvider;
use Laravel\Sanctum\PersonalAccessToken;

function startChallenge(User $user): string
{
    return test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'iPhone',
    ])->assertOk()->assertJson(['two_factor' => true])->json('challenge');
}

test('login for a 2FA user returns a challenge and no token', function () {
    $user = User::factory()->withTwoFactor()->create();

    $challenge = startChallenge($user);

    expect($challenge)->toBeString()->toHaveLength(40)
        ->and(PersonalAccessToken::count())->toBe(0);
});

test('a valid TOTP code completes the challenge', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)
        ->shouldReceive('verify')->with('secret', '123456')->andReturn(true);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'code' => '123456'])
        ->assertOk()->assertJsonStructure(['token', 'user']);

    expect(PersonalAccessToken::where('name', 'iPhone')->count())->toBe(1);
});

test('a wrong TOTP code is rejected', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)
        ->shouldReceive('verify')->andReturn(false);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'code' => '000000'])
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('a recovery code completes the challenge once and cannot be reused', function () {
    $user = User::factory()->withTwoFactor()->create();

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'recovery_code' => 'recovery-code-1'])
        ->assertOk();

    expect($user->fresh()->recoveryCodes())->not->toContain('recovery-code-1');

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => startChallenge($user), 'recovery_code' => 'recovery-code-1'])
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('an unknown challenge is rejected', function () {
    $this->postJson('/api/v1/auth/two-factor', ['challenge' => str_repeat('x', 40), 'code' => '123456'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});

test('an expired challenge is rejected', function () {
    $user = User::factory()->withTwoFactor()->create();
    $challenge = startChallenge($user);

    $this->travel(6)->minutes();

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'recovery_code' => 'recovery-code-1'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});

test('a challenge cannot be used twice', function () {
    $user = User::factory()->withTwoFactor()->create();
    $this->mock(TwoFactorAuthenticationProvider::class)->shouldReceive('verify')->andReturn(true);
    $challenge = startChallenge($user);

    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => '123456'])->assertOk();
    $this->postJson('/api/v1/auth/two-factor', ['challenge' => $challenge, 'code' => '123456'])
        ->assertUnprocessable()->assertJsonValidationErrors(['challenge']);
});
```

`tests/Feature/Api/ForgotPasswordTest.php`:

```php
<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('forgot-password sends a reset link to a known email', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();

    Notification::assertSentTo($user, ResetPassword::class);
});

test('forgot-password responds identically for an unknown email', function () {
    Notification::fake();
    $user = User::factory()->create();

    $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->json();
    $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json();

    expect($unknown)->toBe($known);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/TwoFactorLoginTest.php tests/Feature/Api/ForgotPasswordTest.php`
Expected: FAIL — the 2FA user receives a token instead of a challenge; `/auth/two-factor` and `/auth/forgot-password` are 404.

- [ ] **Step 3: Implement the challenge and forgot-password**

In `app/Http/Controllers/Api/AuthController.php` add these imports:

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\TwoFactorAuthenticationProvider;
```

Replace the final `return $this->issueToken(...)` line of `login()` with:

```php
        if ($user->hasEnabledTwoFactorAuthentication()) {
            $challenge = Str::random(40);

            Cache::put($this->challengeKey($challenge), [
                'user_id' => $user->id,
                'device_name' => $credentials['device_name'],
            ], now()->addMinutes(5));

            return response()->json(['two_factor' => true, 'challenge' => $challenge]);
        }

        return $this->issueToken($user, $credentials['device_name']);
```

Add these methods to the class:

```php
    public function twoFactor(Request $request, TwoFactorAuthenticationProvider $provider): JsonResponse
    {
        $data = $request->validate([
            'challenge' => ['required', 'string'],
            'code' => ['nullable', 'string', 'required_without:recovery_code'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $pending = Cache::get($this->challengeKey($data['challenge']));
        $user = $pending ? User::find($pending['user_id']) : null;

        if (! $user) {
            throw ValidationException::withMessages(['challenge' => ['This sign-in attempt has expired. Please log in again.']]);
        }

        if (! empty($data['recovery_code'])) {
            $valid = collect($user->recoveryCodes())
                ->contains(fn (string $code) => hash_equals($code, $data['recovery_code']));

            if ($valid) {
                $user->replaceRecoveryCode($data['recovery_code']);
            }
        } else {
            $valid = $provider->verify(
                Fortify::currentEncrypter()->decrypt($user->two_factor_secret),
                $data['code'],
            );
        }

        if (! $valid) {
            throw ValidationException::withMessages(['code' => [__('The provided two factor authentication code was invalid.')]]);
        }

        Cache::forget($this->challengeKey($data['challenge']));

        return $this->issueToken($user, $pending['device_name']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'string', 'email']]);

        // The broker's status is deliberately ignored so the response never
        // reveals whether an account exists for this email.
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'If that email is registered, a reset link is on its way.',
        ]);
    }

    private function challengeKey(string $challenge): string
    {
        return 'api-two-factor:'.$challenge;
    }
```

- [ ] **Step 4: Add the routes**

In `routes/api.php`, after the `auth/login` line:

```php
    Route::post('auth/two-factor', [AuthController::class, 'twoFactor'])->middleware('throttle:6,1');
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/AuthController.php routes/api.php tests/Feature/Api/TwoFactorLoginTest.php tests/Feature/Api/ForgotPasswordTest.php
git commit -m "Add the API two-factor login challenge and forgot-password endpoint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Profile, password and account deletion (`DeleteUser` shared with web)

**Files:**
- Create: `app/Actions/DeleteUser.php`
- Modify: `app/Http/Controllers/Settings/ProfileController.php` (`destroy`)
- Modify: `app/Http/Controllers/Api/MeController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/MeTest.php`

**Interfaces:**
- Consumes: existing `ProfileUpdateRequest`, `PasswordUpdateRequest`, `ProfileDeleteRequest` (they validate with the default guard, which `auth:sanctum` switches to Sanctum, so `current_password` works for token requests).
- Produces:
  - `App\Actions\DeleteUser::handle(User $user): void` — revokes all tokens, then deletes.
  - `PATCH /api/v1/me` `{ name, email }` → `UserResource`
  - `PUT /api/v1/me/password` `{ current_password, password, password_confirmation }` → `204`
  - `DELETE /api/v1/me` `{ password }` → `204`

- [ ] **Step 1: Write the failing test**

`tests/Feature/Api/MeTest.php`:

```php
<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('profile can be updated', function () {
    $this->withToken($this->token)->patchJson('/api/v1/me', ['name' => 'New Name', 'email' => 'new@example.com'])
        ->assertOk()->assertJson(['name' => 'New Name', 'email' => 'new@example.com']);
});

test('profile update rejects an email taken by someone else', function () {
    $other = User::factory()->create();

    $this->withToken($this->token)->patchJson('/api/v1/me', ['name' => 'X', 'email' => $other->email])
        ->assertUnprocessable()->assertJsonValidationErrors(['email']);
});

test('password can be changed with the current password', function () {
    $this->withToken($this->token)->putJson('/api/v1/me/password', [
        'current_password' => 'password',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertNoContent();

    expect(Hash::check('new-password', $this->user->fresh()->password))->toBeTrue();
});

test('password change requires the correct current password', function () {
    $this->withToken($this->token)->putJson('/api/v1/me/password', [
        'current_password' => 'wrong',
        'password' => 'new-password',
        'password_confirmation' => 'new-password',
    ])->assertUnprocessable()->assertJsonValidationErrors(['current_password']);
});

test('account deletion requires the correct password', function () {
    $this->withToken($this->token)->deleteJson('/api/v1/me', ['password' => 'wrong'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);

    expect($this->user->fresh())->not->toBeNull();
});

test('account deletion removes the user and all their tokens', function () {
    $this->user->createToken('other-device');

    $this->withToken($this->token)->deleteJson('/api/v1/me', ['password' => 'password'])->assertNoContent();

    expect(User::find($this->user->id))->toBeNull()
        ->and(PersonalAccessToken::count())->toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Api/MeTest.php`
Expected: FAIL — 405/404 on `PATCH /api/v1/me` and friends.

- [ ] **Step 3: Write `DeleteUser` and use it on the web**

`app/Actions/DeleteUser.php`:

```php
<?php

namespace App\Actions;

use App\Models\User;

class DeleteUser
{
    public function handle(User $user): void
    {
        // Sanctum tokens are a polymorphic relation with no FK cascade, so
        // they must be removed explicitly. Game, invitation and push-token
        // rows cascade from the users FK.
        $user->tokens()->delete();
        $user->delete();
    }
}
```

In `app/Http/Controllers/Settings/ProfileController.php` add `use App\Actions\DeleteUser;` and replace `destroy()` with:

```php
    public function destroy(ProfileDeleteRequest $request, DeleteUser $deleteUser): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $deleteUser->handle($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
```

- [ ] **Step 4: Extend `MeController`**

Replace `app/Http/Controllers/Api/MeController.php` with:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Actions\DeleteUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }

    public function update(ProfileUpdateRequest $request): UserResource
    {
        $user = $request->user();
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return UserResource::make($user);
    }

    public function updatePassword(PasswordUpdateRequest $request): Response
    {
        $request->user()->update(['password' => $request->validated('password')]);

        return response()->noContent();
    }

    public function destroy(ProfileDeleteRequest $request, DeleteUser $deleteUser): Response
    {
        $deleteUser->handle($request->user());

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Add the routes**

Inside the `auth:sanctum` group of `routes/api.php`, after `Route::get('me', ...)`:

```php
        Route::patch('me', [MeController::class, 'update']);
        Route::put('me/password', [MeController::class, 'updatePassword'])->middleware('throttle:6,1');
        Route::delete('me', [MeController::class, 'destroy']);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Api/MeTest.php tests/Feature/Settings`
Expected: PASS (web profile deletion still passes).

- [ ] **Step 7: Commit**

```bash
git add app/Actions/DeleteUser.php app/Http/Controllers/Settings/ProfileController.php app/Http/Controllers/Api/MeController.php routes/api.php tests/Feature/Api/MeTest.php
git commit -m "Add API profile, password and account deletion endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Game API endpoints and resources

**Files:**
- Create: `app/Http/Resources/GameResource.php`, `app/Http/Resources/PlayerResource.php`, `app/Http/Resources/InvitationResource.php`
- Create: `app/Http/Controllers/Api/GameController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/GameApiTest.php`

**Interfaces:**
- Consumes: `CreateGame`, `JoinGame`, `SpyHomeQuery`, `StoreGameRequest`, `UserResource`.
- Produces:
  - `GameResource` → `{ id, code, title, game_type, game_mode, max_players, mission_briefing, status, host_id, player_count, created_at, host?: UserResource, players?: PlayerResource[] }`
  - `PlayerResource` → `{ id, user: UserResource, is_host, status, joined_at }`
  - `InvitationResource` → `{ id, status, game_title, game_code, from_codename, created_at }` (requires `game` and `fromUser` loaded)
  - `GET /api/v1/games/spy` → `{ games: GameResource[], pending_invitations: InvitationResource[] }`
  - `POST /api/v1/games` → `201 GameResource` (with host and players)
  - `GET /api/v1/games/{code}` → `GameResource` (with host and players); 403 for non-members; 404 unknown code
  - `POST /api/v1/games/{code}/join` → `GameResource` (with host and players); 404 unknown code; 422 full
  - `Api\GameController::lobby(Game $game): GameResource` (protected helper, reused by Task 8)

- [ ] **Step 1: Write the failing test**

`tests/Feature/Api/GameApiTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

const GAME_SHAPE = ['id', 'code', 'title', 'game_type', 'game_mode', 'max_players', 'mission_briefing', 'status', 'host_id', 'player_count', 'created_at'];

test('spy home lists my spy games and pending invitations', function () {
    $user = User::factory()->create();
    $game = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);
    Invitation::factory()->create(['to_user_id' => $user->id]);
    Sanctum::actingAs($user);

    $this->getJson('/api/v1/games/spy')
        ->assertOk()
        ->assertJsonStructure([
            'games' => [GAME_SHAPE],
            'pending_invitations' => [['id', 'status', 'game_title', 'game_code', 'from_codename', 'created_at']],
        ])
        ->assertJsonMissingPath('games.0.secret_location');
});

test('creating a game returns the lobby', function () {
    $host = User::factory()->create();
    Sanctum::actingAs($host);

    $this->postJson('/api/v1/games', [
        'title' => 'Op Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole.',
    ])->assertCreated()
        ->assertJsonStructure([...GAME_SHAPE, 'host' => ['id', 'codename'], 'players' => [['id', 'user' => ['id', 'codename'], 'is_host', 'status', 'joined_at']]])
        ->assertJsonPath('player_count', 1)
        ->assertJsonMissingPath('secret_location');
});

test('creating a game validates input', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson('/api/v1/games', ['max_players' => 99])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'game_mode', 'max_players', 'mission_briefing']);
});

test('a member can view the lobby without leaking secrets or other players emails', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'secret_location' => 'Church']);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $member = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $member->id]);
    Sanctum::actingAs($member);

    $response = $this->getJson("/api/v1/games/{$game->code}")->assertOk()->assertJsonPath('player_count', 2);

    expect($response->getContent())->not->toContain('Church')->not->toContain($host->email);
});

test('a non-member gets 403 on the lobby', function () {
    $game = Game::factory()->create();
    Sanctum::actingAs(User::factory()->create());

    $this->getJson("/api/v1/games/{$game->code}")->assertForbidden();
});

test('an unknown or lowercase code is 404 on lobby and join', function () {
    Game::factory()->create(['code' => 'SPY-ABCD']);
    Sanctum::actingAs(User::factory()->create());

    $this->getJson('/api/v1/games/SPY-ZZZZ')->assertNotFound();
    $this->postJson('/api/v1/games/spy-abcd/join')->assertNotFound();
});

test('joining returns the lobby and is idempotent', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson("/api/v1/games/{$game->code}/join")->assertOk()->assertJsonStructure(GAME_SHAPE);
    $this->postJson("/api/v1/games/{$game->code}/join")->assertOk();

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('joining a full game is a 422 on code', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/games/{$game->code}/join")
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'This operation roster is already full.');
});

test('game endpoints require a token', function () {
    $this->getJson('/api/v1/games/spy')->assertUnauthorized();
    $this->postJson('/api/v1/games')->assertUnauthorized();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Api/GameApiTest.php`
Expected: FAIL — 404s.

- [ ] **Step 3: Write the resources**

`app/Http/Resources/PlayerResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\GamePlayer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GamePlayer
 */
class PlayerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => UserResource::make($this->whenLoaded('user')),
            'is_host' => $this->is_host,
            'status' => $this->status,
            'joined_at' => $this->joined_at?->toIso8601String(),
        ];
    }
}
```

`app/Http/Resources/GameResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Game
 */
class GameResource extends JsonResource
{
    /**
     * secret_location is deliberately absent: it must never reach a client.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'game_type' => $this->game_type,
            'game_mode' => $this->game_mode,
            'max_players' => $this->max_players,
            'mission_briefing' => $this->mission_briefing,
            'status' => $this->status,
            'host_id' => $this->host_id,
            'player_count' => $this->relationLoaded('players') ? $this->players->count() : $this->players()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'host' => UserResource::make($this->whenLoaded('host')),
            'players' => PlayerResource::collection($this->whenLoaded('players')),
        ];
    }
}
```

`app/Http/Resources/InvitationResource.php`:

```php
<?php

namespace App\Http\Resources;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invitation
 */
class InvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'game_title' => $this->game->title,
            'game_code' => $this->game->code,
            'from_codename' => $this->fromUser->codename,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

`app/Http/Controllers/Api/GameController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Actions\Games\CreateGame;
use App\Actions\Games\JoinGame;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Queries\SpyHomeQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function spy(Request $request, SpyHomeQuery $spyHome): JsonResponse
    {
        return response()->json([
            'games' => GameResource::collection($spyHome->games($request->user())),
            'pending_invitations' => InvitationResource::collection($spyHome->pendingInvitations($request->user())),
        ]);
    }

    public function store(StoreGameRequest $request, CreateGame $createGame): JsonResponse
    {
        $game = $createGame->handle($request->user(), $request->validated());

        return $this->lobby($game)->response()->setStatusCode(201);
    }

    public function show(Request $request, string $code): GameResource
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->players()->where('user_id', $request->user()->id)->exists(), 403);

        return $this->lobby($game);
    }

    public function join(Request $request, string $code, JoinGame $joinGame): GameResource
    {
        $game = Game::where('code', $code)->firstOrFail();

        return $this->lobby($joinGame->handle($game, $request->user()));
    }

    protected function lobby(Game $game): GameResource
    {
        return GameResource::make($game->load(['host', 'players.user']));
    }
}
```

(`where('code', ...)` on SQLite is case-sensitive for `=`, matching the web join's lowercase test. `Game::where` rather than route-model binding keeps the 404 explicit and identical for `show` and `join`.)

- [ ] **Step 5: Add the routes**

In `routes/api.php` add `use App\Http\Controllers\Api\GameController;` and, inside the `auth:sanctum` group (the literal `games/spy` route must come before `games/{code}`):

```php
        Route::get('games/spy', [GameController::class, 'spy']);
        Route::post('games', [GameController::class, 'store']);
        Route::get('games/{code}', [GameController::class, 'show']);
        Route::post('games/{code}/join', [GameController::class, 'join']);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Api/GameApiTest.php`
Expected: PASS (9 tests).

- [ ] **Step 7: Commit**

```bash
git add app/Http/Resources app/Http/Controllers/Api/GameController.php routes/api.php tests/Feature/Api/GameApiTest.php
git commit -m "Add API endpoints for the spy home, creating, viewing and joining games

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Invitation API endpoints

**Files:**
- Create: `app/Http/Controllers/Api/InvitationController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/InvitationApiTest.php`

**Interfaces:**
- Consumes: `SendInvitation`, `AcceptInvitation`, `DeclineInvitation`, `InvitableUsersQuery`, `GameResource`, `InvitationResource`.
- Produces:
  - `GET /api/v1/games/{code}/invitable-users` → `[{ id, name, codename, invite_status }]`; 403 unless host and recruiting
  - `POST /api/v1/games/{code}/invitations` `{ to_user_id }` → `201 InvitationResource`
  - `POST /api/v1/invitations/{id}/accept` → `GameResource` (with host and players)
  - `POST /api/v1/invitations/{id}/decline` → `204`

- [ ] **Step 1: Write the failing test**

`tests/Feature/Api/InvitationApiTest.php`:

```php
<?php

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->host = User::factory()->create();
    $this->game = Game::factory()->create(['host_id' => $this->host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $this->game->id, 'user_id' => $this->host->id, 'is_host' => true]);
});

test('the host lists invitable users', function () {
    $other = User::factory()->create();
    Sanctum::actingAs($this->host);

    $this->getJson("/api/v1/games/{$this->game->code}/invitable-users")
        ->assertOk()
        ->assertExactJson([['id' => $other->id, 'name' => $other->name, 'codename' => $other->codename, 'invite_status' => null]]);
});

test('a non-host cannot list invitable users', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->getJson("/api/v1/games/{$this->game->code}/invitable-users")->assertForbidden();
});

test('the host sends an invitation', function () {
    Event::fake([InvitationSent::class]);
    $invitee = User::factory()->create();
    Sanctum::actingAs($this->host);

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $invitee->id])
        ->assertCreated()
        ->assertJson(['status' => 'pending', 'game_code' => $this->game->code, 'from_codename' => $this->host->codename]);

    Event::assertDispatched(InvitationSent::class);
});

test('sending validates and enforces rules as 422', function () {
    Sanctum::actingAs($this->host);

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => 999999])
        ->assertUnprocessable()->assertJsonValidationErrors(['to_user_id']);
    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $this->host->id])
        ->assertUnprocessable()->assertJsonPath('errors.to_user_id.0', 'You cannot invite yourself.');
});

test('a non-host cannot send invitations', function () {
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/games/{$this->game->code}/invitations", ['to_user_id' => $this->host->id])
        ->assertForbidden();
});

test('the recipient accepts and gets the lobby', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")
        ->assertOk()->assertJsonPath('code', $this->game->code)->assertJsonPath('player_count', 2);
});

test('accepting into a full game is a 422 on invitation', function () {
    $this->game->update(['max_players' => 1]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")
        ->assertUnprocessable()->assertJsonPath('errors.invitation.0', 'This operation roster is already full.');
});

test('the recipient declines', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id, 'to_user_id' => $recipient->id]);
    Sanctum::actingAs($recipient);

    $this->postJson("/api/v1/invitations/{$invitation->id}/decline")->assertNoContent();

    expect($invitation->fresh()->status)->toBe('declined');
});

test('only the recipient can accept or decline', function () {
    $invitation = Invitation::factory()->create(['game_id' => $this->game->id]);
    Sanctum::actingAs(User::factory()->create());

    $this->postJson("/api/v1/invitations/{$invitation->id}/accept")->assertForbidden();
    $this->postJson("/api/v1/invitations/{$invitation->id}/decline")->assertForbidden();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Api/InvitationApiTest.php`
Expected: FAIL — 404s.

- [ ] **Step 3: Write the controller**

`app/Http/Controllers/Api/InvitationController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Actions\Invitations\AcceptInvitation;
use App\Actions\Invitations\DeclineInvitation;
use App\Actions\Invitations\SendInvitation;
use App\Http\Controllers\Controller;
use App\Http\Resources\GameResource;
use App\Http\Resources\InvitationResource;
use App\Models\Game;
use App\Models\Invitation;
use App\Queries\InvitableUsersQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvitationController extends Controller
{
    public function invitable(Request $request, string $code, InvitableUsersQuery $invitableUsers): JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        return response()->json($invitableUsers->for($game, $request->user()));
    }

    public function store(Request $request, string $code, SendInvitation $sendInvitation): JsonResponse
    {
        $game = Game::where('code', $code)->firstOrFail();

        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $invitation = $sendInvitation->handle($game, $request->user(), (int) $validated['to_user_id']);

        return InvitationResource::make($invitation->load(['game', 'fromUser']))
            ->response()->setStatusCode(201);
    }

    public function accept(Request $request, Invitation $invitation, AcceptInvitation $acceptInvitation): GameResource
    {
        $game = $acceptInvitation->handle($invitation, $request->user());

        return GameResource::make($game->load(['host', 'players.user']));
    }

    public function decline(Request $request, Invitation $invitation, DeclineInvitation $declineInvitation): Response
    {
        $declineInvitation->handle($invitation, $request->user());

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Add the routes**

In `routes/api.php` add `use App\Http\Controllers\Api\InvitationController;` and, inside the `auth:sanctum` group:

```php
        Route::get('games/{code}/invitable-users', [InvitationController::class, 'invitable']);
        Route::post('games/{code}/invitations', [InvitationController::class, 'store']);
        Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept']);
        Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline']);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/Api/InvitationApiTest.php`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/InvitationController.php routes/api.php tests/Feature/Api/InvitationApiTest.php
git commit -m "Add API endpoints for listing invitable users and sending, accepting and declining invitations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Token-authenticated broadcast auth

**Files:**
- Modify: `routes/api.php` (outside the `v1` group)
- Test: `tests/Feature/Api/BroadcastAuthTest.php`

**Interfaces:**
- Produces: `POST /api/broadcasting/auth` accepting `Authorization: Bearer <token>` for the same channels as the web route. Plan B's Pusher client posts here.

- [ ] **Step 1: Write the failing test**

`tests/Feature/Api/BroadcastAuthTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('a token can authorize its own private user channel', function () {
    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-user.'.$this->user->id,
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth']);
});

test('a token can join the presence channel', function () {
    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ])->assertOk()->assertJsonStructure(['auth', 'channel_data']);
});

test('a token can authorize a game channel it is a member of, and not others', function () {
    $mine = Game::factory()->create();
    GamePlayer::factory()->create(['game_id' => $mine->id, 'user_id' => $this->user->id]);
    $theirs = Game::factory()->create();

    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-game.'.$mine->id, 'socket_id' => '1234.5678',
    ])->assertOk();

    $this->withToken($this->token)->postJson('/api/broadcasting/auth', [
        'channel_name' => 'private-game.'.$theirs->id, 'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('broadcast auth without a token is 401', function () {
    $this->postJson('/api/broadcasting/auth', [
        'channel_name' => 'presence-online-users', 'socket_id' => '1234.5678',
    ])->assertUnauthorized();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Api/BroadcastAuthTest.php`
Expected: FAIL — 404.

- [ ] **Step 3: Register the route**

In `routes/api.php` add `use Illuminate\Support\Facades\Broadcast;` and, at the bottom of the file (outside the `v1` group — the file's own `api` prefix makes this `/api/broadcasting/auth`):

```php
Broadcast::routes(['middleware' => ['auth:sanctum']]);
```

- [ ] **Step 4: Run the tests to verify they pass, and the web channel tests still pass**

Run: `php artisan test tests/Feature/Api/BroadcastAuthTest.php tests/Feature/BroadcastingChannelsTest.php`
Expected: PASS. Also confirm both routes exist: `php artisan route:list --path=broadcasting` lists `broadcasting/auth` and `api/broadcasting/auth`.

- [ ] **Step 5: Commit**

```bash
git add routes/api.php tests/Feature/Api/BroadcastAuthTest.php
git commit -m "Add token-authenticated broadcast auth for mobile clients

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Push tokens and invitation push notifications

**Files:**
- Create: `database/migrations/2026_09_26_000000_create_push_tokens_table.php`
- Create: `app/Models/PushToken.php`
- Modify: `app/Models/User.php` (`pushTokens()` relation)
- Create: `app/Http/Controllers/Api/PushTokenController.php`
- Create: `app/Listeners/SendInvitationPushNotification.php`
- Modify: `config/services.php` (`expo` entry), `.env.example` (`EXPO_ACCESS_TOKEN=`)
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/PushTokenTest.php`, `tests/Feature/Listeners/SendInvitationPushNotificationTest.php`

**Interfaces:**
- Consumes: event `InvitationSent` (existing; the `broadcast()` helper dispatches it through the event dispatcher, so listeners fire).
- Produces:
  - `POST /api/v1/me/push-tokens` `{ token, platform: 'ios'|'android' }` → `204` (upsert on `token`, reassigning owner and access token)
  - `DELETE /api/v1/me/push-tokens/{token}` → `204`
  - Expo message data `{ type: 'invitation', invitation_id, code }` — Plan B's tap handler reads exactly these keys.

- [ ] **Step 1: Write the failing tests**

`tests/Feature/Api/PushTokenTest.php`:

```php
<?php

use App\Models\PushToken;
use App\Models\User;

const EXPO_TOKEN = 'ExponentPushToken[abc123]';

test('a device registers its push token against the current access token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('iPhone');

    $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'ios'])
        ->assertNoContent();

    $row = PushToken::sole();
    expect($row->user_id)->toBe($user->id)
        ->and($row->personal_access_token_id)->toBe($token->accessToken->id)
        ->and($row->platform)->toBe('ios');
});

test('registering validates token format and platform', function () {
    $token = User::factory()->create()->createToken('x')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/me/push-tokens', ['token' => 'nope', 'platform' => 'web'])
        ->assertUnprocessable()->assertJsonValidationErrors(['token', 'platform']);
});

test('a token registered by a second account on a shared device is reassigned, not duplicated', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();

    $this->withToken($first->createToken('a')->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'android'])->assertNoContent();
    $this->app['auth']->forgetGuards();
    $this->withToken($second->createToken('b')->plainTextToken)
        ->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'android'])->assertNoContent();

    expect(PushToken::sole()->user_id)->toBe($second->id);
});

test('a user deletes their own push token but not someone elses', function () {
    $owner = User::factory()->create();
    PushToken::create(['user_id' => $owner->id, 'token' => EXPO_TOKEN, 'platform' => 'ios']);
    $intruder = User::factory()->create();

    $this->withToken($intruder->createToken('x')->plainTextToken)
        ->deleteJson('/api/v1/me/push-tokens/'.urlencode(EXPO_TOKEN))->assertNoContent();
    expect(PushToken::count())->toBe(1);

    $this->app['auth']->forgetGuards();
    $this->withToken($owner->createToken('y')->plainTextToken)
        ->deleteJson('/api/v1/me/push-tokens/'.urlencode(EXPO_TOKEN))->assertNoContent();
    expect(PushToken::count())->toBe(0);
});

test('logging out removes that devices push token', function () {
    $user = User::factory()->create();
    $plain = $user->createToken('iPhone')->plainTextToken;
    $this->withToken($plain)->postJson('/api/v1/me/push-tokens', ['token' => EXPO_TOKEN, 'platform' => 'ios']);

    $this->withToken($plain)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect(PushToken::count())->toBe(0);
});
```

`tests/Feature/Listeners/SendInvitationPushNotificationTest.php`:

```php
<?php

use App\Events\InvitationSent;
use App\Listeners\SendInvitationPushNotification;
use App\Models\Invitation;
use App\Models\PushToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

test('the listener is registered for InvitationSent and queued', function () {
    // Dispatching the real event here would also attempt a Pusher broadcast
    // with the fake test credentials, so assert the wiring directly.
    Event::assertListening(InvitationSent::class, SendInvitationPushNotification::class);

    expect(new SendInvitationPushNotification)->toBeInstanceOf(ShouldQueue::class);
});

test('it sends one Expo message per device with the invitation data', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'a'], ['status' => 'ok', 'id' => 'b']]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[two]', 'platform' => 'android']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    Http::assertSent(function ($request) use ($invitation) {
        $messages = $request->data();

        return $request->url() === 'https://exp.host/--/api/v2/push/send'
            && count($messages) === 2
            && $messages[0]['to'] === 'ExponentPushToken[one]'
            && $messages[0]['title'] === 'New operation invite'
            && $messages[0]['body'] === "{$invitation->fromUser->codename} invited you to {$invitation->game->title}"
            && $messages[0]['data'] === ['type' => 'invitation', 'invitation_id' => $invitation->id, 'code' => $invitation->game->code];
    });
});

test('it makes no request when the invitee has no devices', function () {
    Http::fake();

    app(SendInvitationPushNotification::class)->handle(new InvitationSent(Invitation::factory()->create()));

    Http::assertNothingSent();
});

test('it deletes tokens Expo reports as DeviceNotRegistered', function () {
    Http::fake(['exp.host/*' => Http::response(['data' => [
        ['status' => 'error', 'message' => 'gone', 'details' => ['error' => 'DeviceNotRegistered']],
        ['status' => 'ok', 'id' => 'b'],
    ]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[dead]', 'platform' => 'ios']);
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[live]', 'platform' => 'ios']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    expect(PushToken::pluck('token')->all())->toBe(['ExponentPushToken[live]']);
});

test('it sends the Expo access token when configured', function () {
    config(['services.expo.access_token' => 'expo-secret']);
    Http::fake(['exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'a']]])]);
    $invitation = Invitation::factory()->create();
    PushToken::create(['user_id' => $invitation->to_user_id, 'token' => 'ExponentPushToken[one]', 'platform' => 'ios']);

    app(SendInvitationPushNotification::class)->handle(new InvitationSent($invitation));

    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer expo-secret'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/PushTokenTest.php tests/Feature/Listeners`
Expected: FAIL — `Class "App\Models\PushToken" not found`.

- [ ] **Step 3: Migration and model**

`database/migrations/2026_09_26_000000_create_push_tokens_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('personal_access_token_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('token')->unique();
            $table->string('platform');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
```

(Check the Sanctum migration's filename timestamp from Task 4 is earlier than `2026_09_26_000000`; if it is not, rename this file to a later timestamp so the FK target exists.)

`app/Models/PushToken.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'personal_access_token_id', 'token', 'platform'])]
class PushToken extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

In `app/Models/User.php` add:

```php
    /**
     * @return HasMany<PushToken, $this>
     */
    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }
```

- [ ] **Step 4: Controller and routes**

`app/Http/Controllers/Api/PushTokenController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushToken;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

class PushTokenController extends Controller
{
    public function store(Request $request): Response
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255', 'regex:/^Expo(nent)?PushToken\[.+\]$/'],
            'platform' => ['required', 'in:ios,android'],
        ]);

        $accessToken = $request->user()->currentAccessToken();

        // Upsert on the device token: a shared device that signs in as a
        // different account takes the token over rather than duplicating it.
        PushToken::updateOrCreate(['token' => $data['token']], [
            'user_id' => $request->user()->id,
            'personal_access_token_id' => $accessToken instanceof PersonalAccessToken ? $accessToken->id : null,
            'platform' => $data['platform'],
        ]);

        return response()->noContent();
    }

    public function destroy(Request $request, string $token): Response
    {
        $request->user()->pushTokens()->where('token', $token)->delete();

        return response()->noContent();
    }
}
```

In `routes/api.php` add `use App\Http\Controllers\Api\PushTokenController;` and, inside the `auth:sanctum` group:

```php
        Route::post('me/push-tokens', [PushTokenController::class, 'store']);
        Route::delete('me/push-tokens/{token}', [PushTokenController::class, 'destroy']);
```

- [ ] **Step 5: Config and the listener**

In `config/services.php` add before the closing `];`:

```php
    'expo' => [
        'access_token' => env('EXPO_ACCESS_TOKEN'),
    ],
```

Append to `.env.example`:

```
EXPO_ACCESS_TOKEN=
```

`app/Listeners/SendInvitationPushNotification.php`:

```php
<?php

namespace App\Listeners;

use App\Events\InvitationSent;
use App\Models\PushToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;

class SendInvitationPushNotification implements ShouldQueue
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    public function handle(InvitationSent $event): void
    {
        $invitation = $event->invitation->loadMissing(['game', 'fromUser', 'toUser.pushTokens']);
        $tokens = $invitation->toUser->pushTokens->values();

        if ($tokens->isEmpty()) {
            return;
        }

        $messages = $tokens->map(fn (PushToken $token) => [
            'to' => $token->token,
            'title' => 'New operation invite',
            'body' => "{$invitation->fromUser->codename} invited you to {$invitation->game->title}",
            'sound' => 'default',
            'channelId' => 'invitations',
            'data' => [
                'type' => 'invitation',
                'invitation_id' => $invitation->id,
                'code' => $invitation->game->code,
            ],
        ])->all();

        $request = Http::acceptJson()->asJson();

        if ($accessToken = config('services.expo.access_token')) {
            $request = $request->withToken($accessToken);
        }

        // Tickets come back in the same order as the messages.
        $tickets = $request->post(self::EXPO_PUSH_URL, $messages)->throw()->json('data', []);

        foreach ($tickets as $index => $ticket) {
            if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                $tokens[$index]->delete();
            }
        }
    }
}
```

(The test asserts `data` equals exactly `{type, invitation_id, code}`; `channelId` sits beside it, not inside it. Laravel auto-discovers listeners in `app/Listeners`, so no registration is needed — the `assertListening` test proves it.)

- [ ] **Step 6: Run migrations and tests**

Run: `php artisan migrate && php artisan test tests/Feature/Api/PushTokenTest.php tests/Feature/Listeners`
Expected: PASS (10 tests).

- [ ] **Step 7: Run the full invitation suites (the listener now runs synchronously in tests)**

Run: `php artisan test`
Expected: PASS — existing invitation tests create no push tokens, so the listener returns early without HTTP.

- [ ] **Step 8: Commit**

```bash
git add database/migrations app/Models/PushToken.php app/Models/User.php app/Http/Controllers/Api/PushTokenController.php app/Listeners config/services.php .env.example routes/api.php tests/Feature/Api/PushTokenTest.php tests/Feature/Listeners
git commit -m "Register device push tokens and send invitation push notifications through Expo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Documentation and final verification

**Files:**
- Modify: `laravel-app/README.md` (append a "Mobile API" section)

- [ ] **Step 1: Document the API**

Append to `laravel-app/README.md`:

```markdown
## Mobile API

The Expo app (`../expo-app`) talks to a token-authenticated JSON API under
`/api/v1`, served alongside the Inertia web app. Web behaviour is unchanged;
both clients share the Action classes in `app/Actions`.

- **Auth:** Laravel Sanctum personal access tokens (`Authorization: Bearer …`).
  `POST /api/v1/auth/login` returns `{ token, user }`, or
  `{ two_factor: true, challenge }` for users with 2FA enabled — complete it
  with `POST /api/v1/auth/two-factor` within 5 minutes.
- **Endpoints:** `auth/register`, `auth/login`, `auth/two-factor`,
  `auth/forgot-password`, `auth/logout`, `me` (GET/PATCH/DELETE),
  `me/password`, `me/push-tokens`, `games/spy`, `games`, `games/{code}`,
  `games/{code}/join`, `games/{code}/invitable-users`,
  `games/{code}/invitations`, `invitations/{id}/accept|decline`.
- **Errors:** 422 responses use Laravel's validation shape
  (`{ message, errors: { field: [..] } }`), including game-rule violations.
- **Real-time:** mobile clients authorize channels at
  `/api/broadcasting/auth`. `PlayerJoined` (`player.joined`) broadcasts on
  `private-game.{id}` to roster members; web lobbies refresh on it too.
- **Push:** devices register Expo push tokens; `InvitationSent` queues
  `SendInvitationPushNotification`, which calls Expo's push API. Production
  needs a queue worker. Set `EXPO_ACCESS_TOKEN` if Expo enhanced push
  security is enabled.
- **Production (Laravel Cloud):** use a managed database rather than the
  SQLite file, enable a queue worker, configure mail (password resets), and
  set the Pusher variables.
```

- [ ] **Step 2: Run every check**

Run: `php artisan test && composer lint:check && ./vendor/bin/phpstan analyse && npm run types:check && npm run check`
Expected: all exit 0. Fix any Pint/PHPStan findings in the files this plan touched, then re-run.

- [ ] **Step 3: Run the web E2E suite to prove web behaviour is unchanged**

Run (with `composer run dev` serving the app in another terminal, as the existing Cypress setup expects): `npm run test:e2e`
Expected: specs `01_auth_and_lobby`, `02_invitations`, `03_game_picker` pass.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document the mobile API in the Laravel app README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
