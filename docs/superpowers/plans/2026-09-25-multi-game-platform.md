# Multi-Game Platform (Spy as the First Game) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Dashboard into a game picker (Spy playable, other slots "Coming Soon"), move Spy's actual content to its own page, and reserve a `game_type` concept on the `games` table for future games — without building any per-type rules system.

**Architecture:** `dashboard` (route + `Dashboard.vue`) becomes a static picker with no data dependency. A new `games.spy` route + `games/Spy.vue` page host everything the Dashboard used to do (create/join a game, your operations, pending invitations). `games` gets an explicit `game_type` column, set by `GameController::store()`, with no database default.

**Tech Stack:** Laravel 13 + Inertia + Vue 3 + SQLite (unchanged from Phase 1/2).

**Spec:** `docs/superpowers/specs/2026-09-25-multi-game-platform-design.md`

## Global Constraints

- No per-game-type rules system (min/max players, teams). Spy keeps its existing flat-roster, `max_players` model untouched.
- `game_type` has no database default — every path that creates a `Game` row must set it explicitly (today, only `GameController::store()` and `GameFactory`).
- The picker (`Dashboard.vue`/`DashboardController::index()`) must not query `games` or `invitations` at all — it's a static list of game types.
- Existing route names `games.show`, `games.join`, `games.store`, `invitations.*` are untouched. Only `InvitationController::decline()`'s redirect target changes (from `dashboard` to `games.spy`).
- This codebase's established convention for game-related links is raw path strings (`/games/${game.code}`, `/invitations/${id}/accept`), not generated Wayfinder route helpers — match this for the new `/games/spy` link, don't introduce a new pattern.
- Pest functional test style (`test('...', fn () => ...)`) for new test files; `DashboardTest.php` is an existing PHPUnit-class-style file — preserve that style when editing it, per the established convention already followed in this codebase (see Task 2).

## Review Focus

- **Picker leaking game data:** the picker must render with zero `games`/`pendingInvitations` props — a test should assert this explicitly, not just that the page loads. (Task 3)
- **Existing Cypress specs silently breaking:** `01_auth_and_lobby.cy.ts` and `02_invitations.cy.ts` assume the Dashboard IS the Spy page immediately after registering/logging in (`cy.get('#input-game-title')` right after `cy.registerAgent(...)`, `cy.get('#pending-invitations')` right after `cy.loginAgent(...)`). Both break once the picker replaces that content. (Task 4)
- **`game_type` silently null on existing/new games:** since there's no DB default, any create path that forgets to set it gets a NOT NULL constraint violation (loud failure, good) — but a test must confirm `GameController::store()` actually sets it, not just that game creation still works. (Task 1)
- **Coming-soon tiles being accidentally clickable:** a static `<div>` with no `href`/click handler is required, not a disabled `<Link>` — a test should confirm clicking them does not navigate. (Task 4)
- **`InvitationController::decline()`'s redirect silently left pointing at the picker:** if this is missed, declining an invitation reroutes a user to game-less picker with no path back to what they were doing. (Task 2)

---

### Task 1: `game_type` column, model, factory, and `GameController::store()`

**Files:**
- Create: `database/migrations/<timestamp>_add_game_type_to_games_table.php`
- Modify: `app/Models/Game.php`
- Modify: `database/factories/GameFactory.php`
- Modify: `app/Http/Controllers/GameController.php`
- Test: `tests/Feature/GameCreationTest.php` (new file — no existing test file covers `GameController::store()` in isolation; if you find one during implementation that already does, add to it instead of creating a duplicate)

**Interfaces:**
- Consumes: nothing new.
- Produces: `games.game_type` column (string, not null, no default). Later tasks don't depend on this beyond it existing and being set to `'spy'`.

- [ ] **Step 1: Write the failing test**

First, check whether `tests/Feature/GameCreationTest.php` already exists and covers `GameController::store()`. If it does, add the test below to that file. If no such file exists, create it:

```php
<?php

use App\Models\Game;
use App\Models\User;

test('creating a game sets its game_type to spy', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the mole before time runs out.',
    ]);

    $response->assertRedirect();
    $game = Game::where('title', 'Operation Nightfall')->firstOrFail();
    expect($game->game_type)->toBe('spy');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest --filter="creating a game sets its game_type to spy"`
Expected: FAIL — `game_type` column doesn't exist yet.

- [ ] **Step 3: Create the migration**

Run: `cd laravel-app && php artisan make:migration add_game_type_to_games_table`

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
        Schema::table('games', function (Blueprint $table) {
            $table->string('game_type')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('game_type');
        });
    }
};
```

Note: no `->default(...)` — every code path that creates a `Game` must set this explicitly (Global Constraints). Since there's no default and the column isn't nullable, this migration only works on a database with no existing rows (true for this app's SQLite dev/test databases at this stage) — `php artisan migrate:fresh` if your local database already has games in it.

- [ ] **Step 4: Add `game_type` to the model's fillable attributes**

In `laravel-app/app/Models/Game.php`, change:

```php
#[Fillable(['title', 'game_mode', 'code', 'host_id', 'max_players', 'mission_briefing', 'secret_location', 'status'])]
```

to:

```php
#[Fillable(['title', 'game_mode', 'code', 'host_id', 'max_players', 'mission_briefing', 'secret_location', 'status', 'game_type'])]
```

- [ ] **Step 5: Set `game_type` in the factory**

In `laravel-app/database/factories/GameFactory.php`, add `'game_type' => 'spy',` to the `definition()` array (alongside the existing `'code'`, `'title'`, etc. — order doesn't matter, but keep it readable, e.g. right after `'code'`).

- [ ] **Step 6: Set `game_type` in `GameController::store()`**

In `laravel-app/app/Http/Controllers/GameController.php`, change:

```php
            $game = Game::create([
                ...$request->validated(),
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
                'host_id' => $request->user()->id,
            ]);
```

to:

```php
            $game = Game::create([
                ...$request->validated(),
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
                'host_id' => $request->user()->id,
                'game_type' => 'spy',
            ]);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest --filter="creating a game sets its game_type to spy"`
Expected: PASS.

- [ ] **Step 8: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green. (Every other test that creates a `Game` goes through `GameFactory`, which Step 5 already covers — nothing else should need changing.)

- [ ] **Step 9: Commit**

```bash
git add laravel-app
git commit -m "Add game_type column, set explicitly on game creation"
```

---

### Task 2: `games.spy` route, `DashboardController::spy()`, and the invitation-decline redirect

**Files:**
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/DashboardController.php`
- Modify: `app/Http/Controllers/InvitationController.php`
- Modify: `tests/Feature/DashboardTest.php`
- Create: `tests/Feature/SpyDashboardTest.php`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: named route `games.spy` (`GET /games/spy`), rendering Inertia component `games/Spy` with props `{games, pendingInvitations}` — the exact same shape `DashboardController::index()` produces today. Task 3's `games/Spy.vue` consumes this. Task 4's Cypress specs navigate to this route.

- [ ] **Step 1: Move the existing Dashboard tests to a new file for the Spy route**

`laravel-app/tests/Feature/DashboardTest.php` currently has 4 test methods. Two of them (`test_dashboard_lists_the_users_games`, `test_dashboard_lists_the_users_pending_invitations`) test data that's moving to `games.spy`. Create `laravel-app/tests/Feature/SpyDashboardTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpyDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('games.spy'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_spy_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.spy'));
        $response->assertOk();
    }

    public function test_spy_dashboard_lists_the_users_games()
    {
        $user = User::factory()->create();
        $game = Game::factory()->create(['host_id' => $user->id, 'title' => 'Operation Nightfall']);
        GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id, 'is_host' => true]);

        $this->actingAs($user);

        $response = $this->get(route('games.spy'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('games/Spy')
            ->has('games', 1)
            ->where('games.0.title', 'Operation Nightfall'));
    }

    public function test_spy_dashboard_lists_the_users_pending_invitations()
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

        $response = $this->get(route('games.spy'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('pendingInvitations', 1)
            ->where('pendingInvitations.0.game_title', 'Operation Schoolyard')
            ->where('pendingInvitations.0.from_codename', 'NIGHT_HAWK'));
    }
}
```

Then remove `test_dashboard_lists_the_users_games` and `test_dashboard_lists_the_users_pending_invitations` from `laravel-app/tests/Feature/DashboardTest.php`, leaving only `test_guests_are_redirected_to_the_login_page` and `test_authenticated_users_can_visit_the_dashboard` (both still valid — the picker also requires auth and returns 200; don't change their bodies, they don't need to).

- [ ] **Step 2: Run the new and existing tests to verify the expected failure**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/SpyDashboardTest.php`
Expected: FAIL — route `games.spy` doesn't exist yet.

- [ ] **Step 3: Add the `spy()` method to `DashboardController`**

In `laravel-app/app/Http/Controllers/DashboardController.php`, change:

```php
class DashboardController extends Controller
{
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
}
```

to:

```php
class DashboardController extends Controller
{
    public function index(): Response
    {
        return inertia('Dashboard');
    }

    public function spy(Request $request): Response
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

        return inertia('games/Spy', [
            'games' => $games,
            'pendingInvitations' => $pendingInvitations,
        ]);
    }
}
```

(`Request`, `Invitation`, and `Response` are already imported in this file — no import changes needed. `index()` no longer takes a `Request` parameter since it doesn't use one.)

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add, inside the existing `Route::middleware(['auth'])->group(...)` block, near the existing `dashboard` route:

```php
    Route::get('games/spy', [DashboardController::class, 'spy'])->name('games.spy');
```

- [ ] **Step 5: Update the invitation-decline redirect**

In `laravel-app/app/Http/Controllers/InvitationController.php`, change:

```php
    public function decline(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        if ($invitation->status === 'pending') {
            $invitation->update(['status' => 'declined']);
        }

        return to_route('dashboard');
    }
```

to:

```php
    public function decline(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($invitation->to_user_id === $request->user()->id, 403);

        if ($invitation->status === 'pending') {
            $invitation->update(['status' => 'declined']);
        }

        return to_route('games.spy');
    }
```

There's an existing test `tests/Feature/InvitationDeclineTest.php` with a test named `'declining an invitation marks it declined without joining the game'` that asserts `$response->assertRedirect(route('dashboard'))`. Update that one assertion to `$response->assertRedirect(route('games.spy'))` — nothing else in that file needs to change.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/SpyDashboardTest.php tests/Feature/DashboardTest.php tests/Feature/InvitationDeclineTest.php`
Expected: PASS (4 tests in SpyDashboardTest, 2 in DashboardTest, 4 in InvitationDeclineTest).

Note: `SpyDashboardTest`'s `component('games/Spy')` assertion will fail until Task 3 creates that Vue file (Inertia's test helper verifies the component file exists on disk — this bit the plan during the previous feature's Task 7 for the same reason). This is expected and will resolve once Task 3 runs; don't try to work around it in this task.

- [ ] **Step 7: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green except the `component('games/Spy')` assertion noted above, which is expected to fail until Task 3.

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Add games.spy route and DashboardController::spy(), redirect declines there"
```

---

### Task 3: The picker page and the Spy page

**Files:**
- Modify: `resources/js/pages/Dashboard.vue` (becomes the picker)
- Create: `resources/js/pages/games/Spy.vue` (the moved content)
- Test: extends `tests/Feature/DashboardTest.php` (already modified by Task 2 — this task adds one more test to it)

**Interfaces:**
- Consumes: `games.spy` route (Task 2, as a raw path string `/games/spy`, matching this codebase's established convention of raw paths for game-related links — not a generated Wayfinder helper).
- Produces: nothing later tasks depend on beyond the two DOM ids `#tile-spy` and `#tile-coming-soon` that Task 4's new Cypress spec consumes.

- [ ] **Step 1: Write the failing test**

Add this test method to `laravel-app/tests/Feature/DashboardTest.php` (inside the existing `DashboardTest` class, alongside its two remaining tests):

```php
    public function test_dashboard_does_not_expose_any_game_data()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->missing('games')
            ->missing('pendingInvitations'));
    }
```

(`User` is already imported in this file.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest --filter="test_dashboard_does_not_expose_any_game_data"`
Expected: PASS already, actually — `DashboardController::index()` was already simplified in Task 2 to `return inertia('Dashboard');` with no props. If this test passes immediately, that's correct (Task 2 already did the backend half of this task); continue to Step 3 for the frontend half regardless, since `Dashboard.vue` itself still has the old content until this step.

- [ ] **Step 3: Create the Spy page with the moved content**

Create `laravel-app/resources/js/pages/games/Spy.vue` with exactly the current content of `laravel-app/resources/js/pages/Dashboard.vue`, with one change to the breadcrumb. Read `laravel-app/resources/js/pages/Dashboard.vue` first to copy its current full content, then change this part:

```ts
defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
        ],
    },
});
```

to:

```ts
defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Spy',
                href: '/games/spy',
            },
        ],
    },
});
```

Since the breadcrumb no longer uses the `dashboard()` helper, remove `dashboard` from the import line — change:

```ts
import { Head, Link, usePage } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
import { dashboard } from '@/routes';
```

to:

```ts
import { Head, Link, usePage } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
```

Also change `<Head title="Dashboard" />` to `<Head title="Spy" />`.

Everything else in the file (the `GameRow`/`PendingInvitationRow` interfaces, `defineProps`, the `page` const, and the entire `<template>` block including `#games-list` and `#pending-invitations`) stays exactly as it is today — copy it verbatim.

- [ ] **Step 4: Replace Dashboard.vue with the picker**

Replace the entire contents of `laravel-app/resources/js/pages/Dashboard.vue` with:

```vue
<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { dashboard } from '@/routes';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Games',
                href: dashboard(),
            },
        ],
    },
});
</script>

<template>
    <Head title="Choose a Game" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <h1 class="text-xl font-bold">Choose a Game</h1>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
                id="tile-spy"
                href="/games/spy"
                class="rounded-xl border border-sidebar-border/70 p-4 hover:border-primary dark:border-sidebar-border"
            >
                <h2 class="font-semibold">Spy</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                    A social-deduction party game. Find the mole before time
                    runs out.
                </p>
            </Link>

            <div
                class="tile-coming-soon rounded-xl border border-dashed border-sidebar-border/70 p-4 opacity-50 dark:border-sidebar-border"
                aria-disabled="true"
            >
                <h2 class="font-semibold">Coming Soon</h2>
            </div>

            <div
                class="tile-coming-soon rounded-xl border border-dashed border-sidebar-border/70 p-4 opacity-50 dark:border-sidebar-border"
                aria-disabled="true"
            >
                <h2 class="font-semibold">Coming Soon</h2>
            </div>
        </div>
    </div>
</template>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/DashboardTest.php tests/Feature/SpyDashboardTest.php`
Expected: PASS (3 tests in DashboardTest, 4 in SpyDashboardTest — `SpyDashboardTest`'s `component('games/Spy')` assertion, which failed at the end of Task 2, now passes since the file exists).

- [ ] **Step 6: Verify the frontend builds**

Run: `cd laravel-app && npm run check && npm run types:check && npm run build`
Expected: all succeed. If `npm run check` reports formatting issues on either file, run `npx vp check --fix -- resources/js/pages/Dashboard.vue resources/js/pages/games/Spy.vue` and re-verify — this is expected the code above wasn't run through this project's formatter before being written into this plan (the same has happened for essentially every Vue snippet across this project's plans; it's a harmless, cosmetic reformat, not a logic change).

- [ ] **Step 7: Run the full suite and quality gates**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Turn the Dashboard into a game picker, move Spy content to its own page"
```

---

### Task 4: Fix existing Cypress specs, add a picker spec

**Files:**
- Modify: `cypress/e2e/01_auth_and_lobby.cy.ts`
- Modify: `cypress/e2e/02_invitations.cy.ts`
- Create: `cypress/e2e/03_game_picker.cy.ts`

**Interfaces:**
- Consumes: `#tile-spy`, `.tile-coming-soon` (Task 3), `games.spy` route content (Tasks 2/3).
- Produces: nothing later tasks depend on — this is the plan's last task.

- [ ] **Step 1: Fix `01_auth_and_lobby.cy.ts`'s navigation**

Read `laravel-app/cypress/e2e/01_auth_and_lobby.cy.ts` first. Both tests in this file call `cy.registerAgent(...)` for the host and then immediately interact with `#input-game-title`, which used to be on the Dashboard (where `registerAgent` lands) but is now on `/games/spy`. In both tests, insert `cy.visit('/games/spy');` immediately after the host's `cy.registerAgent(...)` call and before the first `cy.get('#input-game-title')` call. Concretely:

In the first test (`'registers, creates a game, and lands in its lobby'`), change:

```ts
        cy.registerAgent('Host Falcon', email);

        cy.get('#input-game-title').type('Operation Nightfall');
```

to:

```ts
        cy.registerAgent('Host Falcon', email);
        cy.visit('/games/spy');

        cy.get('#input-game-title').type('Operation Nightfall');
```

In the second test (`'lets a second user join by invite code and appear in the roster after a revisit'`), change:

```ts
        cy.registerAgent('Host Echo', hostEmail);
        cy.get('#input-game-title').type('Operation Schoolyard');
```

to:

```ts
        cy.registerAgent('Host Echo', hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Schoolyard');
```

and, further down in that same test, change:

```ts
                cy.registerAgent('Recruit Ghost', recruitEmail);
                cy.get('#input-join-code').type(code);
```

to:

```ts
                cy.registerAgent('Recruit Ghost', recruitEmail);
                cy.visit('/games/spy');
                cy.get('#input-join-code').type(code);
```

Do not change anything else in this file — the host-revisit flow near the end (`cy.loginAgent(hostEmail); cy.visit(\`/games/${code}\`);`) already navigates directly to the specific game's lobby by code and is unaffected by this change.

- [ ] **Step 2: Fix `02_invitations.cy.ts`'s navigation**

Read `laravel-app/cypress/e2e/02_invitations.cy.ts` first. Both tests have two navigation gaps: (a) the host registers, then immediately types into `#input-game-title`; (b) the recruit logs in, then immediately expects `#pending-invitations` to be visible. Both now need an intermediate visit to `/games/spy`.

In the first test, change:

```ts
        cy.registerAgent(hostName, hostEmail);
        cy.get('#input-game-title').type('Operation Signal');
```

to:

```ts
        cy.registerAgent(hostName, hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Signal');
```

and change:

```ts
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('Operation Signal');
```

to:

```ts
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.visit('/games/spy');
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('Operation Signal');
```

In the second test, change:

```ts
        cy.registerAgent(hostName, hostEmail);
        cy.get('#input-game-title').type('Operation Quiet');
```

to:

```ts
        cy.registerAgent(hostName, hostEmail);
        cy.visit('/games/spy');
        cy.get('#input-game-title').type('Operation Quiet');
```

and change:

```ts
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('button', 'Decline').click();
```

to:

```ts
        cy.clearCookies();
        cy.loginAgent(recruitEmail);
        cy.visit('/games/spy');
        cy.get('#pending-invitations', { timeout: 8000 }).should('be.visible');
        cy.get('#pending-invitations').contains('button', 'Decline').click();
```

- [ ] **Step 3: Write the new picker spec**

Create `laravel-app/cypress/e2e/03_game_picker.cy.ts`:

```ts
describe('Game picker', () => {
    it('shows Spy as playable and other slots as coming soon', () => {
        const email = `picker_${Date.now()}@example.com`;
        cy.registerAgent('Picker Tester', email);

        // registerAgent lands on /dashboard, which is now the picker.
        cy.get('#tile-spy').should('be.visible').and('have.attr', 'href', '/games/spy');
        cy.get('.tile-coming-soon').should('have.length', 2);
        cy.get('.tile-coming-soon').first().click();
        cy.url().should('include', '/dashboard');

        cy.get('#tile-spy').click();
        cy.url().should('include', '/games/spy');
        cy.get('#input-game-title').should('be.visible');
    });
});
```

- [ ] **Step 4: Attempt to run the specs locally**

Run:
```bash
cd laravel-app && php artisan serve &
cd laravel-app && npm run build && npx cypress run --spec "cypress/e2e/01_auth_and_lobby.cy.ts,cypress/e2e/02_invitations.cy.ts,cypress/e2e/03_game_picker.cy.ts"
```
Expected: passes in a real CI/Linux environment. If this machine has the same known pre-existing local macOS/Electron Cypress launch incompatibility documented in earlier phases of this project, document that expected failure mode in your report rather than treating it as a spec defect — real verification happens in CI.

- [ ] **Step 5: Stop the dev server**

Run: `kill %1` (or find and kill the `php artisan serve` process another way).

- [ ] **Step 6: Run the full suite and quality gates one more time**

Run: `cd laravel-app && composer test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Fix Cypress specs for the new game picker, add picker coverage"
```

---

## Self-Review Notes

- **Spec coverage:** routing/page split (Task 2, 3), data model (Task 1), UI/component structure (Task 3), testing scope's call-out that existing specs need fixing (Task 4) — every section of the design spec has an owning task.
- **Review Focus coverage:** all five listed risks have an owning task and test — picker leaking game data (Task 3's `missing('games')`/`missing('pendingInvitations')` test), existing Cypress specs breaking (Task 4's navigation fixes), `game_type` silently null (Task 1's explicit-set test), coming-soon tiles being clickable (Task 4's picker spec asserting `.tile-coming-soon` count and that clicking one doesn't navigate away from `/dashboard`), and the decline-redirect regression (Task 2's updated `InvitationDeclineTest` assertion).
- **Type/name consistency:** `game_type` (not `gameType`/`type`) used identically from Task 1's migration/model/factory/controller through the plan; route name `games.spy` and Inertia component `games/Spy` used identically in Task 2's controller and Task 3's file creation; DOM ids `#tile-spy`/`.tile-coming-soon` defined in Task 3 and consumed only in Task 4, with matching spelling.
- No placeholders: every step has literal file paths and complete code, not descriptions of what to write.
