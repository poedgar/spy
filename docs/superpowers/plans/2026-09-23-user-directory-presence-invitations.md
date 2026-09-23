# User Directory, Presence & Game Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a game's host, from that game's Lobby, invite a specific registered user to join — with real online-status tracking (via Pusher presence channels) and a pending/accept/decline invitation flow (with a live toast if the recipient is online, and a persistent "Pending Invitations" inbox on their Dashboard either way).

**Architecture:** Laravel Broadcasting over Pusher: an app-wide presence channel drives live online/offline tracking client-side (no new "online" column — presence membership is the source of truth), and a private per-user channel pushes invitation notifications. A new `invitations` table/model holds pending/accepted/declined state, with a small `InvitationController` (index/store/accept/decline) reusing the authorization and full-roster patterns already established by `GameController::join()`.

**Tech Stack:** Laravel 13 broadcasting (Pusher driver), `pusher/pusher-php-server`, `laravel-echo` + `pusher-js` on the frontend, Vue 3 composables for the presence/notification wiring, `vue-sonner` (already in use) for the live toast.

**Spec:** `docs/superpowers/specs/2026-09-23-user-directory-presence-invitations-design.md`

## Global Constraints

- Real-time driver is Pusher (a real Pusher account/app is required — this plan cannot create one; the user supplies `PUSHER_APP_ID`/`KEY`/`SECRET`/`APP_CLUSTER` in their own `.env`).
- "Online" status has no persisted column — it's derived entirely from Pusher presence-channel membership on the client.
- Invitations are pending/accept/decline, not instant-add — a real `invitations` table.
- Reuses the existing `game_players` full-roster and authorization patterns from `GameController::join()`/`store()` rather than inventing new ones.
- Cypress E2E covers only the non-realtime path (send → recipient sees it on their Dashboard after a page load → accept → lands in lobby). The live presence dot and live toast are explicitly *not* CI-covered — manually verified only, per the spec.
- All work stays under `laravel-app/`, following the established conventions: Pest functional test style (`test('...', fn () => ...)`), `#[Fillable]`/`#[Hidden]` PHP attributes (not `protected $fillable` properties), typed Eloquent relations with `@return BelongsTo<X, $this>`/`HasMany<X, $this>` docblocks, plain HTML + Tailwind in Vue components (not the shadcn `ui/` kit — Phase 1 deliberately didn't use it for its own forms).

## Review Focus

- A host inviting themselves via a hand-crafted request (the Invite Users page excludes the current user from its list, but that's client-side only) — `store()` must reject it server-side too.
- Double-accepting or double-declining an invitation that's already been resolved (double-click, stale page, browser back button) — must fail gracefully, not create a duplicate `game_players` row or silently flip an already-declined invitation back to accepted.
- Accepting an invitation after the game's roster filled up in the time between the invite being sent and being accepted — must be rejected gracefully at accept-time, mirroring `join()`'s existing full-roster handling.
- A non-host (a regular player, or a user with no relationship to the game at all) directly POSTing to the invite/accept/decline endpoints for a game or invitation that isn't theirs to act on.
- Opening the Invite Users page, or sending an invite, for a game that's no longer `recruiting` (active/voting/completed) — must 403, not silently succeed into a game already underway.

---

### Task 1: Broadcasting infrastructure (Pusher, channels, config)

**Files:**
- Modify: `composer.json` (add `pusher/pusher-php-server`)
- Create: `config/broadcasting.php` (via `config:publish`, not hand-written)
- Create: `routes/channels.php`
- Modify: `bootstrap/app.php`
- Modify: `.env.example`
- Test: `tests/Feature/BroadcastingChannelsTest.php`

**Interfaces:**
- Consumes: nothing from earlier tasks (this is the first task).
- Produces: the `presence-online-users` and `private-user.{id}` channel authorization rules, and a working `pusher` broadcast connection. Later tasks (3, 8) depend on these channel names existing exactly as `online-users` (presence) and `user.{id}` (private) in `routes/channels.php`.

- [ ] **Step 1: Require the Pusher PHP SDK**

Run: `cd laravel-app && composer require pusher/pusher-php-server`
Expected: package added to `composer.json`/`composer.lock` with no errors.

- [ ] **Step 2: Publish the broadcasting config**

Run: `cd laravel-app && php artisan config:publish broadcasting --force -n`
Expected: creates `laravel-app/config/broadcasting.php` — Laravel's real stock file, defining `pusher`, `reverb`, `ably`, `log`, and `null` connections, all driven by env vars. Do not hand-edit this file's content; it's generated correctly as-is.

- [ ] **Step 3: Write the channel authorization routes**

Create `laravel-app/routes/channels.php`:

```php
<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

Broadcast::channel('online-users', function (User $user): array {
    return [
        'id' => $user->id,
        'codename' => $user->codename,
    ];
});
```

- [ ] **Step 4: Wire the channels route file into the app**

In `laravel-app/bootstrap/app.php`, change:

```php
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
```

to:

```php
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
```

- [ ] **Step 5: Add the Pusher environment variables**

In `laravel-app/.env.example`, change:

```
BROADCAST_CONNECTION=log
```

to:

```
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

Make the same change in the real `.env` file (`laravel-app/.env`, gitignored — not committed), filling in real values from an actual Pusher app dashboard. If real credentials aren't available yet, leave the keys blank for now — Pest's tests use `Event::fake()` and don't need a live connection, but nothing broadcast-related will actually reach a browser until real credentials are supplied.

- [ ] **Step 6: Write the channel authorization test**

Create `laravel-app/tests/Feature/BroadcastingChannelsTest.php`:

```php
<?php

use App\Models\User;

test('a user can authorize their own private channel', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'private-user.'.$user->id,
    ]);

    $response->assertOk();
});

test('a user cannot authorize another users private channel', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'private-user.'.$otherUser->id,
    ]);

    $response->assertForbidden();
});

test('any authenticated user can join the online-users presence channel', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ]);

    $response->assertOk();

    // Pusher's wire format nests `channel_data` as a JSON-encoded string
    // (not a JSON object Laravel's assertJsonPath can traverse into) — decode
    // it explicitly rather than assuming either shape.
    $channelData = $response->json('channel_data');
    $decoded = is_string($channelData) ? json_decode($channelData, true) : $channelData;

    expect($decoded['user_info']['codename'] ?? null)->toBe($user->codename);
});

test('a guest cannot authorize any channel', function () {
    $response = $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-online-users',
        'socket_id' => '1234.5678',
    ]);

    $response->assertRedirect(route('login'));
});
```

- [ ] **Step 7: Run the test**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/BroadcastingChannelsTest.php`
Expected: PASS (4 tests). The `/broadcasting/auth` route is registered automatically by Laravel's broadcasting service provider once `channels:` is wired in `bootstrap/app.php` — no manual route needed.

- [ ] **Step 8: Run the full suite and quality gates**

Run: `cd laravel-app && composer test` (or the individual pieces: `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`, `./vendor/bin/pest`)
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add laravel-app
git commit -m "Add Pusher broadcasting infrastructure and channel authorization"
```

---

### Task 2: `invitations` table, `Invitation` model, and relations

**Files:**
- Create: `database/migrations/<timestamp>_create_invitations_table.php`
- Create: `app/Models/Invitation.php`
- Create: `database/factories/InvitationFactory.php`
- Modify: `app/Models/Game.php` (add `invitations()` relation)
- Modify: `app/Models/User.php` (add `receivedInvitations()` relation)
- Test: `tests/Feature/Models/InvitationTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\User` (existing).
- Produces: `App\Models\Invitation` with `game(): BelongsTo`, `fromUser(): BelongsTo`, `toUser(): BelongsTo`; `Game::invitations(): HasMany`; `User::receivedInvitations(): HasMany`; `Invitation::factory()`. Tasks 4-7's controller and tests use all of these.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/Models/InvitationTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;

test('an invitation belongs to a game, a sender, and a recipient', function () {
    $invitation = Invitation::factory()->create();

    expect($invitation->game)->toBeInstanceOf(Game::class)
        ->and($invitation->fromUser)->toBeInstanceOf(User::class)
        ->and($invitation->toUser)->toBeInstanceOf(User::class);
});

test('an invitation defaults to pending status', function () {
    $invitation = Invitation::factory()->create();

    expect($invitation->status)->toBe('pending');
});

test('a game has many invitations', function () {
    $game = Game::factory()->create();
    Invitation::factory()->count(2)->create(['game_id' => $game->id]);

    expect($game->fresh()->invitations)->toHaveCount(2);
});

test('a user has many received invitations', function () {
    $user = User::factory()->create();
    Invitation::factory()->count(2)->create(['to_user_id' => $user->id]);

    expect($user->fresh()->receivedInvitations)->toHaveCount(2);
});

test('only one invitation row can exist per game and recipient', function () {
    $game = Game::factory()->create();
    $recipient = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);
})->throws(\Illuminate\Database\QueryException::class);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/InvitationTest.php`
Expected: FAIL — `App\Models\Invitation` doesn't exist yet.

- [ ] **Step 3: Create the migration**

Run: `cd laravel-app && php artisan make:migration create_invitations_table`

Replace its contents with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->unique(['game_id', 'to_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
```

- [ ] **Step 4: Create the Invitation model**

Create `laravel-app/app/Models/Invitation.php`:

```php
<?php

namespace App\Models;

use Database\Factories\InvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['game_id', 'from_user_id', 'to_user_id', 'status'])]
class Invitation extends Model
{
    /** @use HasFactory<InvitationFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
```

- [ ] **Step 5: Create the factory**

Create `laravel-app/database/factories/InvitationFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invitation>
 */
class InvitationFactory extends Factory
{
    protected $model = Invitation::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'from_user_id' => User::factory(),
            'to_user_id' => User::factory(),
            'status' => 'pending',
        ];
    }
}
```

- [ ] **Step 6: Add the `invitations()` relation to Game**

In `laravel-app/app/Models/Game.php`, add the import:

```php
use App\Models\Invitation;
```

and add this method (alongside `host()`/`players()`):

```php
    /**
     * @return HasMany<Invitation, $this>
     */
    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }
```

- [ ] **Step 7: Add the `receivedInvitations()` relation to User**

In `laravel-app/app/Models/User.php`, add this method (alongside `gamePlayers()`):

```php
    /**
     * @return HasMany<Invitation, $this>
     */
    public function receivedInvitations(): HasMany
    {
        return $this->hasMany(Invitation::class, 'to_user_id');
    }
```

(`Invitation` and `HasMany` are already imported/available in this file from the existing `gamePlayers()` method — check before adding a duplicate `use` line.)

- [ ] **Step 8: Run the migration**

Run: `cd laravel-app && php artisan migrate`

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/InvitationTest.php`
Expected: PASS (5 tests).

- [ ] **Step 10: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 11: Commit**

```bash
git add laravel-app
git commit -m "Add invitations table and Invitation model"
```

---

### Task 3: `InvitationSent` broadcast event

**Files:**
- Create: `app/Events/InvitationSent.php`
- Test: `tests/Feature/Events/InvitationSentTest.php`

**Interfaces:**
- Consumes: `App\Models\Invitation` (Task 2), the `user.{id}` private channel (Task 1).
- Produces: `App\Events\InvitationSent` — constructed as `new InvitationSent($invitation)`, broadcasts synchronously (no queue worker required) on `private-user.{invitation->to_user_id}` as the `invitation.sent` event, with payload `{ invitation_id, game_title, game_code, from_codename }`. Task 4 dispatches this.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/Events/InvitationSentTest.php`:

```php
<?php

use App\Events\InvitationSent;
use App\Models\Invitation;
use Illuminate\Broadcasting\PrivateChannel;

test('it broadcasts on the recipients private channel', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    $channels = $event->broadcastOn();

    expect($channels)->toHaveCount(1)
        ->and($channels[0])->toBeInstanceOf(PrivateChannel::class)
        ->and($channels[0]->name)->toBe('private-user.'.$invitation->to_user_id);
});

test('it broadcasts the invitation summary', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    $payload = $event->broadcastWith();

    expect($payload)->toBe([
        'invitation_id' => $invitation->id,
        'game_title' => $invitation->game->title,
        'game_code' => $invitation->game->code,
        'from_codename' => $invitation->fromUser->codename,
    ]);
});

test('it broadcasts as invitation.sent', function () {
    $invitation = Invitation::factory()->create();
    $event = new InvitationSent($invitation);

    expect($event->broadcastAs())->toBe('invitation.sent');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Events/InvitationSentTest.php`
Expected: FAIL — `App\Events\InvitationSent` doesn't exist yet.

- [ ] **Step 3: Create the event**

Create `laravel-app/app/Events/InvitationSent.php`:

```php
<?php

namespace App\Events;

use App\Models\Invitation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvitationSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Invitation $invitation,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->invitation->to_user_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->invitation->loadMissing(['game', 'fromUser']);

        return [
            'invitation_id' => $this->invitation->id,
            'game_title' => $this->invitation->game->title,
            'game_code' => $this->invitation->game->code,
            'from_codename' => $this->invitation->fromUser->codename,
        ];
    }

    public function broadcastAs(): string
    {
        return 'invitation.sent';
    }
}
```

Note: this uses `ShouldBroadcastNow` (synchronous), not `ShouldBroadcast` (queued) — this app has no queue worker running, and adding one is out of scope for this feature. Broadcasting synchronously means the HTTP request that sends the invitation blocks briefly on the Pusher API call, which is an acceptable trade-off at this scale.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Events/InvitationSentTest.php`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add laravel-app
git commit -m "Add InvitationSent broadcast event"
```

---

### Task 4: `InvitationController@store` (send an invitation)

**Files:**
- Create: `app/Http/Controllers/InvitationController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/InvitationSendTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\Invitation` (Task 2), `App\Events\InvitationSent` (Task 3).
- Produces: `InvitationController` (file, `store` method), the named route `invitations.store` (`POST /games/{game}/invitations`). Tasks 5-7 add more methods to this same file.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/InvitationSendTest.php`:

```php
<?php

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('a host can send an invitation to a game', function () {
    Event::fake([InvitationSent::class]);

    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertRedirect();
    $invitation = Invitation::where('game_id', $game->id)->where('to_user_id', $invitee->id)->firstOrFail();
    expect($invitation->status)->toBe('pending')
        ->and($invitation->from_user_id)->toBe($host->id);

    Event::assertDispatched(InvitationSent::class, fn (InvitationSent $event) => $event->invitation->is($invitation));
});

test('re-inviting a previously declined user reactivates the same row instead of duplicating', function () {
    Event::fake([InvitationSent::class]);

    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    $invitee = User::factory()->create();
    $existing = Invitation::factory()->create([
        'game_id' => $game->id,
        'to_user_id' => $invitee->id,
        'status' => 'declined',
    ]);

    $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    expect(Invitation::where('game_id', $game->id)->where('to_user_id', $invitee->id)->count())->toBe(1);
    expect($existing->fresh()->status)->toBe('pending');
});

test('a host cannot invite themselves', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $host->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
    expect(Invitation::where('game_id', $game->id)->exists())->toBeFalse();
});

test('a non-host cannot send invitations for a game they do not host', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $notHost = User::factory()->create();
    $invitee = User::factory()->create();

    $response = $this->actingAs($notHost)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertForbidden();
});

test('invitations cannot be sent for a game that is not recruiting', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'status' => 'active']);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertForbidden();
});

test('cannot invite a user already in the game', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 6]);
    $alreadyIn = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $alreadyIn->id]);

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $alreadyIn->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
});

test('cannot invite into a full game', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'max_players' => 1]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $invitee = User::factory()->create();

    $response = $this->actingAs($host)->post(route('invitations.store', $game), [
        'to_user_id' => $invitee->id,
    ]);

    $response->assertSessionHasErrors('to_user_id');
    expect(Invitation::where('game_id', $game->id)->exists())->toBeFalse();
});

test('a guest is redirected to login when trying to send an invitation', function () {
    $game = Game::factory()->create();
    $invitee = User::factory()->create();

    $response = $this->post(route('invitations.store', $game), ['to_user_id' => $invitee->id]);

    $response->assertRedirect(route('login'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationSendTest.php`
Expected: FAIL — route `invitations.store` doesn't exist.

- [ ] **Step 3: Create the controller**

Create `laravel-app/app/Http/Controllers/InvitationController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Events\InvitationSent;
use App\Models\Game;
use App\Models\Invitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function store(Request $request, Game $game): RedirectResponse
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $validated = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $toUserId = (int) $validated['to_user_id'];

        if ($toUserId === $request->user()->id) {
            return back()->withErrors(['to_user_id' => 'You cannot invite yourself.']);
        }

        if ($game->players()->where('user_id', $toUserId)->exists()) {
            return back()->withErrors(['to_user_id' => 'That operative is already in this operation.']);
        }

        if ($game->players()->count() >= $game->max_players) {
            return back()->withErrors(['to_user_id' => 'This operation roster is already full.']);
        }

        $invitation = Invitation::updateOrCreate(
            ['game_id' => $game->id, 'to_user_id' => $toUserId],
            ['from_user_id' => $request->user()->id, 'status' => 'pending'],
        );

        broadcast(new InvitationSent($invitation));

        return back();
    }
}
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add the import:

```php
use App\Http\Controllers\InvitationController;
```

and inside the `Route::middleware(['auth'])->group(...)` block, add:

```php
    Route::post('games/{game}/invitations', [InvitationController::class, 'store'])->name('invitations.store');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationSendTest.php`
Expected: PASS (8 tests).

- [ ] **Step 6: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add InvitationController@store"
```

---

### Task 5: `InvitationController@accept`

**Files:**
- Modify: `app/Http/Controllers/InvitationController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/InvitationAcceptTest.php`

**Interfaces:**
- Consumes: `App\Models\Invitation`, `App\Models\GamePlayer` (existing).
- Produces: `InvitationController::accept`, the named route `invitations.accept` (`POST /invitations/{invitation}/accept`).

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/InvitationAcceptTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('accepting an invitation adds the user to the game and marks it accepted', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertRedirect(route('games.show', $game));
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeTrue();
    expect($invitation->fresh()->status)->toBe('accepted');
});

test('accepting an already-resolved invitation fails gracefully without duplicating', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create([
        'game_id' => $game->id,
        'to_user_id' => $recipient->id,
        'status' => 'declined',
    ]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertSessionHasErrors('invitation');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeFalse();
    expect($invitation->fresh()->status)->toBe('declined');
});

test('accepting into a game that filled up in the meantime fails gracefully', function () {
    $game = Game::factory()->create(['max_players' => 1]);
    $host = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.accept', $invitation));

    $response->assertSessionHasErrors('invitation');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $recipient->id)->exists())->toBeFalse();
    expect($invitation->fresh()->status)->toBe('pending');
});

test('only the invitations recipient can accept it', function () {
    $game = Game::factory()->create();
    $recipient = User::factory()->create();
    $someoneElse = User::factory()->create();
    $invitation = Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $recipient->id]);

    $response = $this->actingAs($someoneElse)->post(route('invitations.accept', $invitation));

    $response->assertForbidden();
});

test('a guest is redirected to login when trying to accept', function () {
    $invitation = Invitation::factory()->create();

    $response = $this->post(route('invitations.accept', $invitation));

    $response->assertRedirect(route('login'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationAcceptTest.php`
Expected: FAIL — route `invitations.accept` doesn't exist.

- [ ] **Step 3: Add `accept()` to the controller**

In `laravel-app/app/Http/Controllers/InvitationController.php`, add the imports:

```php
use App\Models\GamePlayer;
```

and add this method:

```php
    public function accept(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        if ($invitation->status !== 'pending') {
            return back()->withErrors(['invitation' => 'This invitation is no longer available.']);
        }

        $game = $invitation->game;

        if ($game->players()->count() >= $game->max_players) {
            return back()->withErrors(['invitation' => 'This operation roster is already full.']);
        }

        GamePlayer::create([
            'game_id' => $game->id,
            'user_id' => $request->user()->id,
            'is_host' => false,
            'status' => 'ready',
            'joined_at' => now(),
        ]);

        $invitation->update(['status' => 'accepted']);

        return to_route('games.show', $game);
    }
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add:

```php
    Route::post('invitations/{invitation}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationAcceptTest.php`
Expected: PASS (5 tests).

- [ ] **Step 6: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add InvitationController@accept"
```

---

### Task 6: `InvitationController@decline`

**Files:**
- Modify: `app/Http/Controllers/InvitationController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/InvitationDeclineTest.php`

**Interfaces:**
- Consumes: `App\Models\Invitation` (existing).
- Produces: `InvitationController::decline`, the named route `invitations.decline` (`POST /invitations/{invitation}/decline`).

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/InvitationDeclineTest.php`:

```php
<?php

use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('declining an invitation marks it declined without joining the game', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    $response = $this->actingAs($recipient)->post(route('invitations.decline', $invitation));

    $response->assertRedirect(route('dashboard'));
    expect($invitation->fresh()->status)->toBe('declined');
    expect(GamePlayer::where('game_id', $invitation->game_id)->where('user_id', $recipient->id)->exists())->toBeFalse();
});

test('declining an already-resolved invitation does not change an accepted status', function () {
    $recipient = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id, 'status' => 'accepted']);

    $this->actingAs($recipient)->post(route('invitations.decline', $invitation));

    expect($invitation->fresh()->status)->toBe('declined');
});

test('only the invitations recipient can decline it', function () {
    $recipient = User::factory()->create();
    $someoneElse = User::factory()->create();
    $invitation = Invitation::factory()->create(['to_user_id' => $recipient->id]);

    $response = $this->actingAs($someoneElse)->post(route('invitations.decline', $invitation));

    $response->assertForbidden();
    expect($invitation->fresh()->status)->toBe('pending');
});

test('a guest is redirected to login when trying to decline', function () {
    $invitation = Invitation::factory()->create();

    $response = $this->post(route('invitations.decline', $invitation));

    $response->assertRedirect(route('login'));
});
```

Note: "declining an already-resolved invitation does not change an accepted status" intentionally asserts the *current* simple behavior (decline always sets `declined`, even over an existing `accepted` row) rather than adding extra guard logic — accepting already created the `game_players` row, which decline does not touch or undo, so an accepted-then-declined invitation is a harmless, if slightly odd, terminal state. This is a deliberate scope decision, not an oversight: guarding against it would need to decide whether declining after accepting should also remove the player, which is out of scope for this feature.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationDeclineTest.php`
Expected: FAIL — route `invitations.decline` doesn't exist.

- [ ] **Step 3: Add `decline()` to the controller**

In `laravel-app/app/Http/Controllers/InvitationController.php`, add this method:

```php
    public function decline(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        $invitation->update(['status' => 'declined']);

        return to_route('dashboard');
    }
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add:

```php
    Route::post('invitations/{invitation}/decline', [InvitationController::class, 'decline'])->name('invitations.decline');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationDeclineTest.php`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add InvitationController@decline"
```

---

### Task 7: `InvitationController@index` (invite candidates for a game)

**Files:**
- Modify: `app/Http/Controllers/InvitationController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/InvitationIndexTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\User`, `App\Models\Invitation` (existing).
- Produces: `InvitationController::index`, the named route `invitations.index` (`GET /games/{game}/invite`), which renders `inertia('games/InviteUsers', ...)`. Task 9's `InviteUsers.vue` consumes the exact prop shape this produces: `game: { id, code, title }`, `users: Array<{ id, name, codename, invite_status: 'pending' | null }>`.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/InvitationIndexTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;

test('the host sees the invite page listing other users', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $candidate = User::factory()->create();

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('games/InviteUsers')
        ->has('users', 1)
        ->where('users.0.id', $candidate->id)
        ->where('users.0.invite_status', null));
});

test('the current user and existing roster members are excluded from the candidate list', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);
    $alreadyIn = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $alreadyIn->id]);
    $candidate = User::factory()->create();

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->has('users', 1)
        ->where('users.0.id', $candidate->id));
});

test('a user with a pending invitation is annotated as pending', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $invitee->id, 'status' => 'pending']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->where('users.0.invite_status', 'pending'));
});

test('a user with a declined invitation is annotated as invitable again', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $invitee = User::factory()->create();
    Invitation::factory()->create(['game_id' => $game->id, 'to_user_id' => $invitee->id, 'status' => 'declined']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertInertia(fn ($page) => $page
        ->where('users.0.invite_status', null));
});

test('a non-host cannot view the invite page for a game they do not host', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    $notHost = User::factory()->create();

    $response = $this->actingAs($notHost)->get(route('invitations.index', $game));

    $response->assertForbidden();
});

test('the invite page is unavailable once the game is no longer recruiting', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'status' => 'active']);

    $response = $this->actingAs($host)->get(route('invitations.index', $game));

    $response->assertForbidden();
});

test('a guest is redirected to login when trying to view the invite page', function () {
    $game = Game::factory()->create();

    $response = $this->get(route('invitations.index', $game));

    $response->assertRedirect(route('login'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationIndexTest.php`
Expected: FAIL — route `invitations.index` doesn't exist.

- [ ] **Step 3: Add `index()` to the controller**

In `laravel-app/app/Http/Controllers/InvitationController.php`, add the imports:

```php
use App\Models\User;
use Inertia\Response;
```

and add this method:

```php
    public function index(Request $request, Game $game): Response
    {
        abort_unless($game->host_id === $request->user()->id, 403);
        abort_unless($game->status === 'recruiting', 403);

        $rosterUserIds = $game->players()->pluck('user_id');
        $pendingInviteeIds = $game->invitations()->where('status', 'pending')->pluck('to_user_id');

        $users = User::query()
            ->where('id', '!=', $request->user()->id)
            ->whereNotIn('id', $rosterUserIds)
            ->orderBy('name')
            ->get(['id', 'name', 'codename'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'codename' => $user->codename,
                'invite_status' => $pendingInviteeIds->contains($user->id) ? 'pending' : null,
            ]);

        return inertia('games/InviteUsers', [
            'game' => $game->only(['id', 'code', 'title']),
            'users' => $users,
        ]);
    }
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add:

```php
    Route::get('games/{game}/invite', [InvitationController::class, 'index'])->name('invitations.index');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/InvitationIndexTest.php`
Expected: PASS (7 tests). (This will also fail with a "view not found"-style error until Task 9 creates `resources/js/pages/games/InviteUsers.vue` — Inertia's test helpers assert on the response payload, not actual Vue rendering, so this should still pass without that file existing yet, since Inertia doesn't validate the component exists server-side. If it does fail for that reason, note it in your report — Task 9 will resolve it either way.)

- [ ] **Step 6: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add InvitationController@index"
```

---

### Task 8: Frontend broadcasting bootstrap (Echo + presence composable)

**Files:**
- Modify: `package.json` (add `laravel-echo`, `pusher-js`)
- Create: `resources/js/echo.ts`
- Modify: `resources/js/app.ts`
- Create: `resources/js/composables/usePresence.ts`

**Interfaces:**
- Consumes: the `online-users` presence channel (Task 1).
- Produces: `window.Echo` (a configured Echo/Pusher client, available globally once `app.ts` loads) and `usePresence(): { onlineUserIds: Ref<Set<number>> }` — a Vue composable other components call to get a reactive set of currently-online user IDs. Task 9's `InviteUsers.vue` consumes this.

- [ ] **Step 1: Install the frontend packages**

Run: `cd laravel-app && npm install laravel-echo pusher-js`

- [ ] **Step 2: Create the Echo bootstrap file**

Create `laravel-app/resources/js/echo.ts`:

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'pusher'>;
    }
}

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
    forceTLS: true,
});

export default window.Echo;
```

- [ ] **Step 3: Import it on app boot**

In `laravel-app/resources/js/app.ts`, add near the top (after the existing imports):

```ts
import './echo';
```

- [ ] **Step 4: Create the presence composable**

Create `laravel-app/resources/js/composables/usePresence.ts`:

```ts
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import echo from '@/echo';

interface PresenceMember {
    id: number;
    codename: string;
}

const onlineUserIds: Ref<Set<number>> = ref(new Set());
let subscriberCount = 0;

export function usePresence(): { onlineUserIds: Ref<Set<number>> } {
    onMounted(() => {
        subscriberCount += 1;

        if (subscriberCount === 1) {
            echo
                .join('online-users')
                .here((members: PresenceMember[]) => {
                    onlineUserIds.value = new Set(members.map((member) => member.id));
                })
                .joining((member: PresenceMember) => {
                    onlineUserIds.value = new Set(onlineUserIds.value).add(member.id);
                })
                .leaving((member: PresenceMember) => {
                    const next = new Set(onlineUserIds.value);
                    next.delete(member.id);
                    onlineUserIds.value = next;
                });
        }
    });

    onBeforeUnmount(() => {
        subscriberCount -= 1;

        if (subscriberCount === 0) {
            echo.leave('online-users');
            onlineUserIds.value = new Set();
        }
    });

    return { onlineUserIds };
}
```

The module-level `subscriberCount` ensures only one actual presence-channel subscription exists no matter how many components call `usePresence()` at once (e.g. if it's ever used in two places on the same page) — joining a presence channel twice from the same client is wasteful and Echo doesn't dedupe it for you.

- [ ] **Step 5: Verify the frontend builds**

Run: `cd laravel-app && npm run check && npm run types:check && npm run build`
Expected: all succeed with no errors. (No Pest test for this task — it's frontend-only infrastructure with nothing to unit-test yet; Task 9's usage of `usePresence()` is where this gets exercised.)

- [ ] **Step 6: Commit**

```bash
git add laravel-app
git commit -m "Add Echo/Pusher bootstrap and the online-presence composable"
```

---

### Task 9: `InviteUsers.vue` page and the Lobby "Invite Players" link

**Files:**
- Create: `resources/js/pages/games/InviteUsers.vue`
- Modify: `resources/js/pages/games/Lobby.vue`
- Test: `tests/Feature/InvitationIndexTest.php:5` (already covers the backend response shape from Task 7 — this task is verified via `npm run build` plus a manual/E2E check, not new Pest tests)

**Interfaces:**
- Consumes: `usePresence()` (Task 8), the `invitations.index`/`invitations.store` routes (Tasks 7, 4), the `GameProp`/`PlayerRow` shape already in `Lobby.vue`.
- Produces: the "Invite Players" link on `Lobby.vue`, visible only to the host on a recruiting game.

- [ ] **Step 1: Add the host/status info Lobby.vue needs, and the Invite Players link**

Read the current `laravel-app/resources/js/pages/games/Lobby.vue` first — the `GameProp` interface currently declares `players` but not `host`, even though the controller already sends a `host` object (`GameController::show()` loads `'host:id,name,codename'`). Change:

```ts
interface GameProp {
    id: number;
    code: string;
    title: string;
    game_mode: string;
    max_players: number;
    mission_briefing: string;
    status: string;
    players: PlayerRow[];
}
```

to:

```ts
interface GameProp {
    id: number;
    code: string;
    title: string;
    game_mode: string;
    max_players: number;
    mission_briefing: string;
    status: string;
    players: PlayerRow[];
    host: {
        id: number;
        name: string;
        codename: string;
    };
}
```

Change the existing import line from:

```ts
import { Head } from '@inertiajs/vue3';
```

to:

```ts
import { computed } from 'vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
```

Change the existing bare, unassigned prop declaration from:

```ts
defineProps<{
    game: GameProp;
}>();
```

to:

```ts
const props = defineProps<{
    game: GameProp;
}>();
```

(Assigning it to `props` is required because the new code below needs to read `game` from *inside* the `<script setup>` block, not just the template — an unassigned `defineProps()` call only exposes the prop names to the template automatically, not to the surrounding script code. The template keeps working unchanged: Vue's `<script setup>` compiler exposes prop names to the template either way, so every existing bare `game.xxx` reference in the template stays exactly as it is — nothing in the template needs to change to `props.game.xxx`.)

Add, after that `props` declaration:

```ts
const page = usePage<{ auth: { user: { id: number } } }>();
const isHost = computed(() => page.props.auth.user.id === props.game.host.id);
```

In the template, inside the `#lobby-header` div, add after the existing player-count paragraph:

```html
            <Link
                v-if="isHost && game.status === 'recruiting'"
                id="btn-invite-players"
                :href="`/games/${game.code}/invite`"
                class="mt-2 inline-block text-sm text-primary underline underline-offset-4"
            >
                Invite Players
            </Link>
```

In the template, inside the `#lobby-header` div, add after the existing player-count paragraph:

```html
            <Link
                v-if="isHost && game.status === 'recruiting'"
                id="btn-invite-players"
                :href="`/games/${game.code}/invite`"
                class="mt-2 inline-block text-sm text-primary underline underline-offset-4"
            >
                Invite Players
            </Link>
```

- [ ] **Step 2: Create the InviteUsers page**

Create `laravel-app/resources/js/pages/games/InviteUsers.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { Head, useForm } from '@inertiajs/vue3';
import { usePresence } from '@/composables/usePresence';

interface UserRow {
    id: number;
    name: string;
    codename: string;
    invite_status: 'pending' | null;
}

interface GameProp {
    id: number;
    code: string;
    title: string;
}

const props = defineProps<{
    game: GameProp;
    users: UserRow[];
}>();

const { onlineUserIds } = usePresence();

const sortedUsers = computed(() =>
    [...props.users].sort((a, b) => {
        const aOnline = onlineUserIds.value.has(a.id);
        const bOnline = onlineUserIds.value.has(b.id);
        if (aOnline !== bOnline) {
            return aOnline ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    }),
);

const form = useForm({ to_user_id: null as number | null });

function invite(userId: number) {
    form.to_user_id = userId;
    form.post(`/games/${props.game.code}/invitations`, { preserveScroll: true });
}
</script>

<template>
    <Head :title="`Invite Players — ${game.title}`" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">Invite Players to {{ game.title }}</h1>

        <ul id="invite-users-list" class="space-y-2">
            <li
                v-for="user in sortedUsers"
                :key="user.id"
                class="flex items-center justify-between rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border"
            >
                <span class="flex items-center gap-2">
                    <span
                        :class="[
                            'inline-block h-2 w-2 rounded-full',
                            onlineUserIds.has(user.id) ? 'bg-green-500' : 'bg-muted-foreground/40',
                        ]"
                    />
                    {{ user.codename }}
                </span>

                <span v-if="user.invite_status === 'pending'" class="text-sm text-muted-foreground">
                    Invited
                </span>
                <button
                    v-else
                    type="button"
                    class="text-sm text-primary underline underline-offset-4"
                    :disabled="form.processing"
                    @click="invite(user.id)"
                >
                    Invite
                </button>
            </li>
        </ul>
    </div>
</template>
```

- [ ] **Step 3: Verify the frontend builds**

Run: `cd laravel-app && npm run check && npm run types:check && npm run build`
Expected: all succeed with no errors.

- [ ] **Step 4: Run the full Pest suite** (confirms Task 7's `InvitationIndexTest` still passes now that the `games/InviteUsers` component genuinely exists)

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add laravel-app
git commit -m "Add the Invite Players page and Lobby link"
```

---

### Task 10: Dashboard "Pending Invitations" section

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php`
- Modify: `resources/js/pages/Dashboard.vue`
- Test: `tests/Feature/DashboardTest.php`

**Interfaces:**
- Consumes: `App\Models\Invitation`, the `invitations.accept`/`invitations.decline` routes (Tasks 5, 6).
- Produces: a `pendingInvitations` prop on the `Dashboard` page, shape `Array<{ id, game_title, game_code, from_codename }>`.

- [ ] **Step 1: Write the failing test**

`laravel-app/tests/Feature/DashboardTest.php` is the starter kit's existing PHPUnit-class-style test file (already extended once, in Phase 1, with a `test_dashboard_lists_the_users_games` method). Add another method to that same class, following its existing style. Add this import alongside the existing ones at the top of the file:

```php
use App\Models\Invitation;
```

and add this method to the class:

```php
    public function test_dashboard_lists_the_users_pending_invitations()
    {
        $user = User::factory()->create();
        $game = Game::factory()->create(['title' => 'Operation Schoolyard']);
        $inviter = User::factory()->create(['codename' => 'NIGHT_HAWK']);
        Invitation::factory()->create([
            'game_id' => $game->id,
            'from_user_id' => $inviter->id,
            'to_user_id' => $user->id,
            'status' => 'pending',
        ]);
        // A resolved invitation should NOT appear in the pending list.
        Invitation::factory()->create(['to_user_id' => $user->id, 'status' => 'declined']);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('pendingInvitations', 1)
            ->where('pendingInvitations.0.game_title', 'Operation Schoolyard')
            ->where('pendingInvitations.0.from_codename', 'NIGHT_HAWK'));
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/DashboardTest.php`
Expected: FAIL — the `dashboard` route doesn't currently pass a `pendingInvitations` prop, so `has('pendingInvitations', 1)` fails.

- [ ] **Step 3: Update the controller**

In `laravel-app/app/Http/Controllers/DashboardController.php`, add the import:

```php
use App\Models\Invitation;
```

and change the `index()` method from:

```php
    public function index(Request $request): Response
    {
        $games = $request->user()
            ->gamePlayers()
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();

        return inertia('Dashboard', [
            'games' => $games,
        ]);
    }
```

to:

```php
    public function index(Request $request): Response
    {
        $games = $request->user()
            ->gamePlayers()
            ->with('game')
            ->get()
            ->pluck('game')
            ->values();

        $pendingInvitations = $request->user()
            ->receivedInvitations()
            ->where('status', 'pending')
            ->with('game:id,title,code', 'fromUser:id,codename')
            ->get()
            ->map(fn (Invitation $invitation) => [
                'id' => $invitation->id,
                'game_title' => $invitation->game->title,
                'game_code' => $invitation->game->code,
                'from_codename' => $invitation->fromUser->codename,
            ]);

        return inertia('Dashboard', [
            'games' => $games,
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/DashboardTest.php`
Expected: PASS (4 tests).

- [ ] **Step 5: Update the Dashboard page**

In `laravel-app/resources/js/pages/Dashboard.vue`, add this interface alongside `GameRow`:

```ts
interface PendingInvitationRow {
    id: number;
    game_title: string;
    game_code: string;
    from_codename: string;
}
```

Change the `defineProps` call from:

```ts
defineProps<{
    games: GameRow[];
}>();
```

to:

```ts
defineProps<{
    games: GameRow[];
    pendingInvitations: PendingInvitationRow[];
}>();
```

Add the `useForm` import to the existing `@inertiajs/vue3` import line (alongside `Head, Link`).

In the template, add a new section after the `#games-list` div, before the closing `</div>` of the outer flex container:

```html
        <div
            v-if="pendingInvitations.length > 0"
            id="pending-invitations"
            class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
        >
            <h2 class="mb-2 font-semibold">Pending Invitations</h2>
            <ul class="space-y-2">
                <li
                    v-for="invitation in pendingInvitations"
                    :key="invitation.id"
                    class="flex items-center justify-between"
                >
                    <span>{{ invitation.game_title }} — invited by {{ invitation.from_codename }}</span>
                    <span class="flex gap-2">
                        <Link
                            :href="`/invitations/${invitation.id}/accept`"
                            method="post"
                            as="button"
                            class="text-sm text-primary underline underline-offset-4"
                        >
                            Accept
                        </Link>
                        <Link
                            :href="`/invitations/${invitation.id}/decline`"
                            method="post"
                            as="button"
                            class="text-sm text-muted-foreground underline underline-offset-4"
                        >
                            Decline
                        </Link>
                    </span>
                </li>
            </ul>
        </div>
```

- [ ] **Step 6: Verify the frontend builds**

Run: `cd laravel-app && npm run check && npm run types:check && npm run build`
Expected: all succeed.

- [ ] **Step 7: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Add Pending Invitations section to the Dashboard"
```

---

### Task 11: Live invitation toast

**Files:**
- Create: `resources/js/composables/useInvitationNotifications.ts`
- Modify: `resources/js/pages/Dashboard.vue`

**Interfaces:**
- Consumes: `window.Echo` (Task 8), the `user.{id}` private channel and `invitation.sent` event name (Tasks 1, 3), `vue-sonner`'s `toast` (already a project dependency, used by `resources/js/lib/flashToast.ts`).
- Produces: `useInvitationNotifications()` — call it once from a mounted, always-visible place; it shows a toast whenever an `invitation.sent` event arrives for the current user. No later task depends on this.

- [ ] **Step 1: Create the composable**

Create `laravel-app/resources/js/composables/useInvitationNotifications.ts`:

```ts
import { onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import echo from '@/echo';

interface InvitationSentPayload {
    invitation_id: number;
    game_title: string;
    game_code: string;
    from_codename: string;
}

export function useInvitationNotifications(currentUserId: number): void {
    onMounted(() => {
        echo
            .private(`user.${currentUserId}`)
            .listen('.invitation.sent', (payload: InvitationSentPayload) => {
                toast.info(`${payload.from_codename} invited you to ${payload.game_title}`);
            });
    });

    onBeforeUnmount(() => {
        echo.leave(`user.${currentUserId}`);
    });
}
```

Note the leading `.` in `.listen('.invitation.sent', ...)` — by default, Echo expects a listened-for event name to match the PHP event class's fully-namespaced name (e.g. `App.Events.InvitationSent`). A leading `.` tells Echo to use the given string exactly as-is instead of namespace-prefixing it. This is required here specifically because `InvitationSent` (Task 3) overrides `broadcastAs()` to send the custom name `invitation.sent` rather than its default namespaced name — this is Laravel Echo's documented convention for any event with a custom `broadcastAs()`.

- [ ] **Step 2: Mount it from the Dashboard**

In `laravel-app/resources/js/pages/Dashboard.vue`, add the import:

```ts
import { useInvitationNotifications } from '@/composables/useInvitationNotifications';
import { usePage } from '@inertiajs/vue3';
```

(extend the existing `@inertiajs/vue3` import line with `usePage` rather than adding a second line), and add, alongside the existing `defineProps`/`defineOptions` calls in the `<script setup>` block:

```ts
const page = usePage<{ auth: { user: { id: number } } }>();
useInvitationNotifications(page.props.auth.user.id);
```

This mounts the listener only while the Dashboard is open — acceptable for this feature per the spec (a live toast is a "nice to have if you happen to be looking at the app," not a guaranteed delivery mechanism; the persistent Dashboard inbox from Task 10 is what a user sees regardless of whether they were online at the moment of the invite).

- [ ] **Step 3: Verify the frontend builds**

Run: `cd laravel-app && npm run check && npm run types:check && npm run build`
Expected: all succeed.

- [ ] **Step 4: Commit**

```bash
git add laravel-app
git commit -m "Add live invitation toast notification"
```

---

### Task 12: Cypress E2E spec (non-realtime path)

**Files:**
- Create: `cypress/e2e/02_invitations.cy.ts`

**Interfaces:**
- Consumes: `cy.registerAgent`/`cy.loginAgent` (existing, from Phase 1's Task 9), all routes/pages from Tasks 4-10.

- [ ] **Step 1: Write the spec**

Create `laravel-app/cypress/e2e/02_invitations.cy.ts`:

```ts
describe('Game invitations (non-realtime path)', () => {
  it('lets a host invite a specific user, who sees it on their dashboard, accepts, and lands in the lobby', () => {
    const hostEmail = `host_${Date.now()}@example.com`;
    const recruitEmail = `recruit_${Date.now()}@example.com`;

    // The invited user registers FIRST, so they exist as a candidate on the invite page.
    cy.registerAgent('Recruit Echo', recruitEmail);
    cy.clearCookies();

    // Host registers, creates a game, opens the invite page.
    cy.registerAgent('Host Falcon', hostEmail);
    cy.get('#input-game-title').type('Operation Signal');
    cy.get('#input-mission-briefing').clear().type('Find the mole.');
    cy.get('#btn-create-game').click();
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

    cy.get('#btn-invite-players').click();
    cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
    cy.contains('#invite-users-list li', 'Invite').first().within(() => {
      cy.contains('button', 'Invite').click();
    });
    cy.contains('#invite-users-list li', 'Invited').should('exist');

    // The recruit logs in on the same browser (simulating a later visit) and sees the invite.
    cy.clearCookies();
    cy.loginAgent(recruitEmail);
    cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
    cy.get('#pending-invitations').contains('Operation Signal');
    cy.get('#pending-invitations').contains('a', 'Accept').click();

    // Accepting redirects into the lobby with the recruit now on the roster.
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
    cy.get('#roster-list').children().should('have.length', 2);
  });

  it('lets a recipient decline an invitation, which then disappears from their dashboard', () => {
    const hostEmail = `host2_${Date.now()}@example.com`;
    const recruitEmail = `recruit2_${Date.now()}@example.com`;

    cy.registerAgent('Recruit Ghost', recruitEmail);
    cy.clearCookies();

    cy.registerAgent('Host Echo', hostEmail);
    cy.get('#input-game-title').type('Operation Quiet');
    cy.get('#input-mission-briefing').clear().type('Find the mole.');
    cy.get('#btn-create-game').click();
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

    cy.get('#btn-invite-players').click();
    cy.get('#invite-users-list', { timeout: 8000 }).should('be.visible');
    cy.contains('#invite-users-list li', 'Invite').first().within(() => {
      cy.contains('button', 'Invite').click();
    });

    cy.clearCookies();
    cy.loginAgent(recruitEmail);
    cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
    cy.get('#pending-invitations').contains('a', 'Decline').click();

    cy.get('#pending-invitations').should('not.exist');
  });
});
```

- [ ] **Step 2: Confirm the app is running and attempt the run**

Run:
```bash
cd laravel-app && php artisan serve &
cd laravel-app && npm run build && npx cypress run --spec cypress/e2e/02_invitations.cy.ts
```
Expected: passes in a real CI/Linux environment. If this machine has the same known pre-existing local macOS/Electron Cypress launch incompatibility documented in Phase 1's tasks, document that expected failure mode in your report rather than treating it as a spec defect — real verification happens in CI (Step 3).

- [ ] **Step 3: Stop the dev server**

Run: `kill %1` (or find and kill the `php artisan serve` process another way).

- [ ] **Step 4: Extend the existing CI workflow's trigger, if needed**

Check `.github/workflows/laravel-app-cypress.yml` (at the true repo root, `/Users/macbook/Desktop/dev/spy/.github/workflows/laravel-app-cypress.yml` — Phase 1 relocated it here). It already runs `npx cypress run`, which picks up every spec under `laravel-app/cypress/e2e/**` automatically — no workflow changes needed unless its `paths:` trigger filter doesn't already cover this new spec file's path (it should, since the filter is `laravel-app/**`).

- [ ] **Step 5: Commit**

```bash
git add laravel-app
git commit -m "Add Cypress E2E spec for the invitation flow"
```

---

### Task 13: Final verification and README update

**Files:**
- Modify: `README.md` (inside `laravel-app/`)

**Interfaces:**
- None — this is the plan's wrap-up task.

- [ ] **Step 1: Update the README**

In `laravel-app/README.md`, add a new section (after the existing "What Phase 1 does" section) describing this feature:

```markdown
## Real-time presence and invitations

Building on Phase 1, this adds:
- A Pusher-backed presence channel (`online-users`) tracking who's
  currently online, with no persisted "online" column — presence
  channel membership is the live source of truth.
- A pending/accept/decline game-invitation flow: from a game's Lobby
  (host only, while the game is `recruiting`), invite a specific
  registered user. They see it on their Dashboard's "Pending
  Invitations" section, plus a live toast if they're online when it's
  sent.

**Requires a real Pusher account.** Set `PUSHER_APP_ID`, `PUSHER_APP_KEY`,
`PUSHER_APP_SECRET`, and `PUSHER_APP_CLUSTER` in your `.env` (see
`.env.example`) — nothing broadcast-related works without real credentials
here, in every environment including CI.

The live presence dot and live toast are **not** covered by the Cypress
CI suite (would require real Pusher credentials as CI secrets and two
simultaneous authenticated sessions) — verify those manually. The
invite → dashboard → accept/decline → lobby flow itself is fully
CI-covered.
```

- [ ] **Step 2: Run the full backend suite one more time**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 3: Run the frontend build one more time**

Run: `cd laravel-app && npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add laravel-app
git commit -m "Document the presence and invitations feature in the README"
```

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec has a task — real-time infrastructure (Task 1), data model (Task 2), the broadcast event (Task 3), all four controller actions (Tasks 4, 5, 6, 7), presence tracking (Task 8), the Invite Users page and Lobby entry point (Task 9), the Dashboard inbox (Task 10), the live toast (Task 11), and the explicitly-scoped-down E2E coverage (Task 12). The "out of scope" items (bots/voting/etc., full lobby live-sync) have no task, as intended.
- **Review Focus coverage:** all five listed risks now have an owning task and test — self-invite (Task 4, `'a host cannot invite themselves'`), double-resolving an invitation (Tasks 5 and 6, `'accepting an already-resolved invitation...'`/`'declining an already-resolved invitation...'`), the game-filled-up-in-the-meantime race (Task 5, `'accepting into a game that filled up in the meantime...'`), non-host access to someone else's game (Tasks 4 and 7, `'a non-host cannot...'`), and inviting/viewing on a non-recruiting game (Tasks 4 and 7, `'...not recruiting'`/`'...no longer recruiting'`).
- **Type/name consistency:** `Invitation` (not `Invite`), `to_user_id`/`from_user_id` (not `invitee_id`/`inviter_id`), and `invite_status: 'pending' | null` are used identically from Task 2 through Task 9's TypeScript interface. The channel names `online-users` (presence) and `user.{id}` (private) are defined once in Task 1 and referenced by exact string in Tasks 3, 8, and 11 without renaming.
