# Laravel/Vue/SQLite Rebuild — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Laravel 13 + Inertia + Vue 3 + SQLite app (in a new `laravel-app/` directory) where a user can register, log in, create a game, and another user can join that game by its invite code and appear in the lobby roster. No real-time push, no game logic (spies/voting/scoring/launch), no i18n, no locations dataset — those are later phases.

**Architecture:** Laravel 13's official Fortify-based Vue starter kit as the scaffold. Two new Eloquent models (`Game`, `GamePlayer`) alongside the starter kit's `User` model. Three new routes/controller actions (`games.store`, `games.show`, `games.join`) plus a rebuilt `dashboard` route backed by a real controller. Two new Vue pages/components layered onto the starter kit's existing Inertia pages.

**Tech Stack:** Laravel 13, Inertia.js, Vue 3 + TypeScript, Tailwind, SQLite, Pest, Cypress.

**Spec:** `docs/superpowers/specs/2026-09-22-laravel-vue-rebuild-phase1-design.md`

## Global Constraints

- Database is SQLite only — no MySQL anywhere in this phase.
- Frontend wiring is Inertia.js — controllers return Vue pages directly, no hand-maintained JSON API.
- Real auth via Laravel Fortify (already scaffolded); the only customizations are codename assignment and disabling email verification.
- Every route this phase adds requires `auth` middleware only, never `verified`.
- New app lives in `laravel-app/` at the repo root; the existing React app (`src/`, `cypress/`) is left untouched.
- Backend tests use Pest (`laravel-app/tests/`); E2E tests use a separate Cypress suite under `laravel-app/cypress/`.
- No bots, spy assignment, voting, scoring, round progression, real-time updates, i18n, or the locations dataset — a small hardcoded 15-name location array is the only "locations" concept this phase needs.

---

### Task 1: Scaffold the Laravel + Vue + SQLite app

**Files:**
- Create: `laravel-app/` (entire scaffolded tree, via CLI)

**Interfaces:**
- Produces: a working Laravel 13 app at `laravel-app/` with its own `composer.json`, `package.json`, `artisan`, `database/database.sqlite`, and passing default test suite. Later tasks assume this exists.

- [ ] **Step 1: Install the Laravel installer globally if not already present**

Run: `composer global require laravel/installer`

If `~/.composer/vendor/bin` (or `~/.config/composer/vendor/bin` on Linux) isn't already on `PATH`, invoke the installer by its full path in the next step instead of relying on a bare `laravel` command.

- [ ] **Step 2: Scaffold the app**

Run (from the repo root):

```bash
~/.composer/vendor/bin/laravel new laravel-app --vue --pest --database=sqlite --npm --no-interaction
```

This creates `laravel-app/`, installs PHP and npm dependencies, creates `laravel-app/database/database.sqlite`, and runs the initial migrations against it.

- [ ] **Step 3: Verify the default test suite passes out of the box**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all tests pass (this is the starter kit's own generated coverage — registration, login, 2FA, passkeys, settings, dashboard guest-redirect).

- [ ] **Step 4: Verify the dev server boots**

Run: `cd laravel-app && php artisan serve &` then `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000`
Expected: `200`. Stop the server afterward (`kill %1` or equivalent).

- [ ] **Step 5: Commit**

```bash
cd /path/to/repo/root
git add laravel-app
git commit -m "Scaffold Laravel 13 Vue starter kit for Phase 1 rebuild"
```

---

### Task 2: Codename assignment + disable email verification

**Files:**
- Create: `laravel-app/app/Support/CodenameGenerator.php`
- Create: `laravel-app/database/migrations/<timestamp>_add_codename_to_users_table.php`
- Modify: `laravel-app/app/Models/User.php`
- Modify: `laravel-app/app/Actions/Fortify/CreateNewUser.php`
- Modify: `laravel-app/config/fortify.php`
- Modify: `laravel-app/routes/web.php`
- Test: `laravel-app/tests/Feature/Support/CodenameGeneratorTest.php`
- Test: `laravel-app/tests/Feature/Auth/CodenameAssignmentTest.php`

**Interfaces:**
- Consumes: nothing beyond the Task 1 scaffold.
- Produces: `App\Support\CodenameGenerator::forName(string $name): string`, a `codename` column on `users`, and a `dashboard` route reachable without email verification. Later tasks' tests use `User::factory()->create()` freely, relying on `codename` being nullable-safe or auto-set by the factory — see Step 7.

- [ ] **Step 1: Write the failing codename generator test**

Create `laravel-app/tests/Feature/Support/CodenameGeneratorTest.php`:

```php
<?php

use App\Support\CodenameGenerator;

test('assigns the same codename for the same name every time', function () {
    expect(CodenameGenerator::forName('Agent_007'))
        ->toBe(CodenameGenerator::forName('Agent_007'));
});

test('assigns a codename from the known wordlist', function () {
    $wordlist = ['SHADOW_FOX', 'NIGHT_HAWK', 'CIPHER_NINE', 'GHOST_PROTOCOL', 'VIPER_ONE', 'COVERT_RAVEN'];

    expect($wordlist)->toContain(CodenameGenerator::forName('Some Random Name'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Support/CodenameGeneratorTest.php`
Expected: FAIL with a "class not found" style error for `App\Support\CodenameGenerator`.

- [ ] **Step 3: Implement the generator**

Create `laravel-app/app/Support/CodenameGenerator.php`:

```php
<?php

namespace App\Support;

class CodenameGenerator
{
    /**
     * @var list<string>
     */
    private const CODENAMES = [
        'SHADOW_FOX',
        'NIGHT_HAWK',
        'CIPHER_NINE',
        'GHOST_PROTOCOL',
        'VIPER_ONE',
        'COVERT_RAVEN',
    ];

    public static function forName(string $name): string
    {
        $sum = array_sum(array_map('ord', str_split($name)));

        return self::CODENAMES[$sum % count(self::CODENAMES)];
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Support/CodenameGeneratorTest.php`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the `codename` column**

Run: `cd laravel-app && php artisan make:migration add_codename_to_users_table --table=users`

This creates `laravel-app/database/migrations/<timestamp>_add_codename_to_users_table.php`. Replace its contents with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('codename')->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('codename');
        });
    }
};
```

- [ ] **Step 6: Run the migration**

Run: `cd laravel-app && php artisan migrate`
Expected: the new migration runs without error.

- [ ] **Step 7: Add `codename` to the User model's fillable attributes and factory**

In `laravel-app/app/Models/User.php`, change:

```php
#[Fillable(['name', 'email', 'password'])]
```

to:

```php
#[Fillable(['name', 'email', 'password', 'codename'])]
```

In `laravel-app/database/factories/UserFactory.php`, find the `definition()` method's returned array (it sets `name`, `email`, `password`, etc.) and add a `codename` entry so factory-created users never violate a future `not null` expectation from application code:

```php
'codename' => \App\Support\CodenameGenerator::forName($this->faker->name()),
```

(Add this as one more key in the existing array returned by `definition()` — don't remove any existing keys.)

- [ ] **Step 8: Wire codename assignment into registration**

In `laravel-app/app/Actions/Fortify/CreateNewUser.php`, add the import:

```php
use App\Support\CodenameGenerator;
```

and change the `User::create([...])` call from:

```php
        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
        ]);
```

to:

```php
        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'codename' => CodenameGenerator::forName($input['name']),
        ]);
```

- [ ] **Step 9: Write the failing registration-assigns-codename test**

Create `laravel-app/tests/Feature/Auth/CodenameAssignmentTest.php`:

```php
<?php

use App\Models\User;

test('registration assigns a codename to the new user', function () {
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'operative@example.com')->firstOrFail();

    expect($user->codename)->not->toBeEmpty();
});

test('a freshly registered user can access the dashboard without verifying email', function () {
    $this->post(route('register.store'), [
        'name' => 'Test Operative',
        'email' => 'operative2@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});
```

- [ ] **Step 10: Run it to verify the second test fails (email verification still required)**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Auth/CodenameAssignmentTest.php`
Expected: the first test PASSes; the second FAILs (redirected to a verify-email screen instead of 200).

- [ ] **Step 11: Disable email verification**

In `laravel-app/config/fortify.php`, remove the line `Features::emailVerification(),` from the `'features'` array.

In `laravel-app/app/Models/User.php`:
- Remove the import `use Illuminate\Contracts\Auth\MustVerifyEmail;`
- Change `class User extends Authenticatable implements MustVerifyEmail, PasskeyUser` to `class User extends Authenticatable implements PasskeyUser`

In `laravel-app/routes/web.php`, change:

```php
Route::middleware(['auth', 'verified'])->group(function () {
```

to:

```php
Route::middleware(['auth'])->group(function () {
```

- [ ] **Step 12: Run the full test suite to verify everything still passes**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all tests pass, including the two new files. (The starter kit's own `EmailVerificationTest.php` should self-skip via its `skipUnlessFortifyHas(Features::emailVerification())` guard — confirm no failures there.)

- [ ] **Step 13: Commit**

```bash
git add laravel-app
git commit -m "Assign codenames at registration and disable email verification"
```

---

### Task 3: `games` table and `Game` model

**Files:**
- Create: `laravel-app/database/migrations/<timestamp>_create_games_table.php`
- Create: `laravel-app/app/Models/Game.php`
- Create: `laravel-app/database/factories/GameFactory.php`
- Test: `laravel-app/tests/Feature/Models/GameTest.php`

**Interfaces:**
- Consumes: `App\Models\User` (Task 1/2).
- Produces: `App\Models\Game` with `generateUniqueCode(): string` (static), `getRouteKeyName(): string` returning `'code'`, and a `host(): BelongsTo` relation. `Game::factory()` for tests. Task 4 adds the `players()` relation to this same file.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/Models/GameTest.php`:

```php
<?php

use App\Models\Game;

test('generateUniqueCode returns a code in the SPY-XXXX format', function () {
    $code = Game::generateUniqueCode();

    expect($code)->toMatch('/^SPY-[A-Z0-9]{4}$/');
});

test('generateUniqueCode never collides with an existing game code', function () {
    $taken = collect(range(1, 25))->map(fn () => Game::factory()->create()->code);

    $new = Game::generateUniqueCode();

    expect($taken)->not->toContain($new);
});

test('a game belongs to its host', function () {
    $game = Game::factory()->create();

    expect($game->host)->toBeInstanceOf(\App\Models\User::class);
});

test('a games route key is its invite code, not its numeric id', function () {
    $game = Game::factory()->create();

    expect($game->getRouteKeyName())->toBe('code');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/GameTest.php`
Expected: FAIL — `App\Models\Game` doesn't exist yet.

- [ ] **Step 3: Create the migration**

Run: `cd laravel-app && php artisan make:migration create_games_table`

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
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('game_mode');
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('max_players');
            $table->text('mission_briefing');
            $table->string('secret_location');
            $table->string('status')->default('recruiting');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
```

- [ ] **Step 4: Create the Game model**

Create `laravel-app/app/Models/Game.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['title', 'game_mode', 'host_id', 'max_players', 'mission_briefing', 'secret_location', 'status'])]
class Game extends Model
{
    use HasFactory;

    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    public static function generateUniqueCode(): string
    {
        do {
            $code = 'SPY-'.collect(range(1, 4))
                ->map(fn () => self::CODE_CHARS[random_int(0, strlen(self::CODE_CHARS) - 1)])
                ->implode('');
        } while (self::where('code', $code)->exists());

        return $code;
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }
}
```

- [ ] **Step 5: Create the factory**

Create `laravel-app/database/factories/GameFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    protected $model = Game::class;

    public function definition(): array
    {
        return [
            'code' => Game::generateUniqueCode(),
            'title' => 'Operation '.fake()->word(),
            'game_mode' => 'mole',
            'host_id' => User::factory(),
            'max_players' => 6,
            'mission_briefing' => 'A rogue operative has intercepted intelligence files.',
            'secret_location' => 'Church',
            'status' => 'recruiting',
        ];
    }
}
```

- [ ] **Step 6: Run the migration**

Run: `cd laravel-app && php artisan migrate`

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/GameTest.php`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Add games table and Game model"
```

---

### Task 4: `game_players` table and `GamePlayer` model

**Files:**
- Create: `laravel-app/database/migrations/<timestamp>_create_game_players_table.php`
- Create: `laravel-app/app/Models/GamePlayer.php`
- Create: `laravel-app/database/factories/GamePlayerFactory.php`
- Modify: `laravel-app/app/Models/Game.php` (add `players()` relation)
- Modify: `laravel-app/app/Models/User.php` (add `gamePlayers()` relation)
- Test: `laravel-app/tests/Feature/Models/GamePlayerTest.php`

**Interfaces:**
- Consumes: `App\Models\Game` (Task 3), `App\Models\User` (Task 1/2).
- Produces: `App\Models\GamePlayer` with `game(): BelongsTo` and `user(): BelongsTo`; `Game::players(): HasMany`; `User::gamePlayers(): HasMany`; `GamePlayer::factory()`. Task 6-9's controllers rely on `$game->players()` and `$user->gamePlayers()`.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/Models/GamePlayerTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('a game player belongs to a game and a user', function () {
    $gamePlayer = GamePlayer::factory()->create();

    expect($gamePlayer->game)->toBeInstanceOf(Game::class)
        ->and($gamePlayer->user)->toBeInstanceOf(User::class);
});

test('a game has many players', function () {
    $game = Game::factory()->create();
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);

    expect($game->fresh()->players)->toHaveCount(3);
});

test('a user has many game_players rows', function () {
    $user = User::factory()->create();
    GamePlayer::factory()->count(2)->create(['user_id' => $user->id]);

    expect($user->fresh()->gamePlayers)->toHaveCount(2);
});

test('the same user cannot join the same game twice at the database level', function () {
    $game = Game::factory()->create();
    $user = User::factory()->create();
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);

    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id]);
})->throws(\Illuminate\Database\QueryException::class);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/GamePlayerTest.php`
Expected: FAIL — `App\Models\GamePlayer` doesn't exist yet.

- [ ] **Step 3: Create the migration**

Run: `cd laravel-app && php artisan make:migration create_game_players_table`

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
        Schema::create('game_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_host')->default(false);
            $table->string('status')->default('ready');
            $table->unsignedInteger('score')->default(0);
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->unique(['game_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_players');
    }
};
```

- [ ] **Step 4: Create the GamePlayer model**

Create `laravel-app/app/Models/GamePlayer.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['game_id', 'user_id', 'is_host', 'status', 'score', 'joined_at'])]
class GamePlayer extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_host' => 'boolean',
            'joined_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Add the `players()` relation to Game**

In `laravel-app/app/Models/Game.php`, add the import:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

and add this method to the class (alongside `host()`):

```php
    public function players(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }
```

- [ ] **Step 6: Add the `gamePlayers()` relation to User**

In `laravel-app/app/Models/User.php`, add the import:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

and add this method to the class:

```php
    public function gamePlayers(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }
```

- [ ] **Step 7: Create the factory**

Create `laravel-app/database/factories/GamePlayerFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GamePlayer>
 */
class GamePlayerFactory extends Factory
{
    protected $model = GamePlayer::class;

    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'user_id' => User::factory(),
            'is_host' => false,
            'status' => 'ready',
            'score' => 0,
            'joined_at' => now(),
        ];
    }
}
```

- [ ] **Step 8: Run the migration**

Run: `cd laravel-app && php artisan migrate`

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/Models/GamePlayerTest.php`
Expected: PASS (4 tests).

- [ ] **Step 10: Run the full suite to check nothing else broke**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add laravel-app
git commit -m "Add game_players table and GamePlayer model"
```

---

### Task 5: `GameController@show` (view lobby) and `Lobby.vue`

**Files:**
- Create: `laravel-app/app/Http/Controllers/GameController.php`
- Modify: `laravel-app/routes/web.php`
- Create: `laravel-app/resources/js/pages/games/Lobby.vue`
- Test: `laravel-app/tests/Feature/GameLobbyTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\GamePlayer` (Task 3/4).
- Produces: the named route `games.show` (`GET /games/{game}`), which Task 6's `store()` and Task 7's `join()` redirect to. `GameController` as a file that Tasks 6/7 add methods to.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/GameLobbyTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('an authenticated player can view a games lobby', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id]);
    GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $host->id, 'is_host' => true]);

    $response = $this->actingAs($host)->get(route('games.show', $game));

    $response->assertOk();
});

test('a guest is redirected to login when viewing a lobby', function () {
    $game = Game::factory()->create();

    $response = $this->get(route('games.show', $game));

    $response->assertRedirect(route('login'));
});

test('the lobby route resolves games by their invite code, not their numeric id', function () {
    $host = User::factory()->create();
    $game = Game::factory()->create(['host_id' => $host->id, 'code' => 'SPY-TEST']);

    $response = $this->actingAs($host)->get('/games/SPY-TEST');

    $response->assertOk();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameLobbyTest.php`
Expected: FAIL — route `games.show` doesn't exist.

- [ ] **Step 3: Create the controller**

Create `laravel-app/app/Http/Controllers/GameController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Game;

class GameController extends Controller
{
    public function show(Game $game)
    {
        return inertia('games/Lobby', [
            'game' => $game->load('players.user', 'host'),
        ]);
    }
}
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, add the import:

```php
use App\Http\Controllers\GameController;
```

and inside the `Route::middleware(['auth'])->group(function () { ... })` block, add:

```php
    Route::get('games/{game}', [GameController::class, 'show'])->name('games.show');
```

- [ ] **Step 5: Create the Lobby page**

Create `laravel-app/resources/js/pages/games/Lobby.vue`:

```vue
<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

interface PlayerRow {
    id: number;
    is_host: boolean;
    status: string;
    score: number;
    user: {
        id: number;
        name: string;
        codename: string;
    };
}

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

defineProps<{
    game: GameProp;
}>();
</script>

<template>
    <Head :title="game.title" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div id="lobby-header" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <p class="text-sm text-muted-foreground">
                Invite code: <span id="game-invite-code" class="font-mono font-bold">{{ game.code }}</span>
            </p>
            <h1 class="text-xl font-bold">{{ game.title }}</h1>
            <p class="text-sm text-muted-foreground">{{ game.players.length }} / {{ game.max_players }} operatives</p>
        </div>

        <div id="operatives-roster" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <h2 class="mb-2 font-semibold">Roster</h2>
            <ul id="roster-list" class="space-y-1">
                <li v-for="player in game.players" :key="player.id" class="flex items-center justify-between">
                    <span>
                        {{ player.user.codename }}
                        <span v-if="player.is_host" class="text-xs text-muted-foreground">(Host)</span>
                    </span>
                    <span class="text-xs text-muted-foreground">{{ player.score }} pts</span>
                </li>
            </ul>
        </div>
    </div>
</template>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameLobbyTest.php`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add GameController@show and the Lobby page"
```

---

### Task 6: `GameController@store` (create game)

**Files:**
- Create: `laravel-app/config/locations.php`
- Create: `laravel-app/app/Http/Requests/StoreGameRequest.php`
- Modify: `laravel-app/app/Http/Controllers/GameController.php`
- Modify: `laravel-app/routes/web.php`
- Test: `laravel-app/tests/Feature/GameCreationTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\GamePlayer` (Task 3/4), the `games.show` route (Task 5).
- Produces: `GameController@store`, the named route `games.store` (`POST /games`), `config('locations.names')` (a `list<string>`). Task 9's `CreateGameForm.vue` posts to this route.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/GameCreationTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('creating a game creates the game and the hosts game_players row', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the spy.',
    ]);

    $game = Game::where('title', 'Operation Nightfall')->firstOrFail();

    $response->assertRedirect(route('games.show', $game));
    expect($game->code)->toMatch('/^SPY-[A-Z0-9]{4}$/');
    expect(config('locations.names'))->toContain($game->secret_location);

    $hostRow = GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->firstOrFail();
    expect($hostRow->is_host)->toBeTrue();
    expect($hostRow->status)->toBe('ready');
});

test('a guest cannot create a game', function () {
    $response = $this->post(route('games.store'), [
        'title' => 'Operation Nightfall',
        'game_mode' => 'mole',
        'max_players' => 6,
        'mission_briefing' => 'Find the spy.',
    ]);

    $response->assertRedirect(route('login'));
});

test('creating a game validates required fields', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.store'), []);

    $response->assertSessionHasErrors(['title', 'game_mode', 'max_players', 'mission_briefing']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameCreationTest.php`
Expected: FAIL — route `games.store` doesn't exist.

- [ ] **Step 3: Create the locations placeholder config**

Create `laravel-app/config/locations.php`:

```php
<?php

return [
    'names' => [
        'Church',
        'School',
        'Castle',
        'Airport Terminal',
        'Public Library',
        'Hospital',
        'Train Station',
        'Supermarket',
        'Museum',
        'Police Station',
        'Fire Station',
        'Hotel Lobby',
        'Movie Cinema',
        'Zoo',
        'Amusement Park',
    ],
];
```

- [ ] **Step 4: Create the form request**

Create `laravel-app/app/Http/Requests/StoreGameRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'game_mode' => ['required', 'string', 'in:mole,codebreaker,counterintel'],
            'max_players' => ['required', 'integer', 'min:3', 'max:12'],
            'mission_briefing' => ['required', 'string', 'max:2000'],
        ];
    }
}
```

- [ ] **Step 5: Add `store()` to the controller**

In `laravel-app/app/Http/Controllers/GameController.php`, add the imports:

```php
use App\Http\Requests\StoreGameRequest;
use App\Models\GamePlayer;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
```

and add this method to the class:

```php
    public function store(StoreGameRequest $request)
    {
        $game = DB::transaction(function () use ($request) {
            $game = Game::create([
                ...$request->validated(),
                'code' => Game::generateUniqueCode(),
                'secret_location' => Arr::random(config('locations.names')),
            ]);

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $request->user()->id,
                'is_host' => true,
                'status' => 'ready',
                'joined_at' => now(),
            ]);

            return $game;
        });

        return to_route('games.show', $game);
    }
```

- [ ] **Step 6: Add the route**

In `laravel-app/routes/web.php`, inside the `Route::middleware(['auth'])->group(...)` block, add:

```php
    Route::post('games', [GameController::class, 'store'])->name('games.store');
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameCreationTest.php`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Add GameController@store and the locations placeholder"
```

---

### Task 7: `GameController@join`

**Files:**
- Modify: `laravel-app/app/Http/Controllers/GameController.php`
- Modify: `laravel-app/routes/web.php`
- Test: `laravel-app/tests/Feature/GameJoinTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\GamePlayer` (Task 3/4), the `games.show` route (Task 5).
- Produces: the named route `games.join` (`POST /games/{game}/join`). Task 9's `JoinGameForm.vue` posts to this route.

- [ ] **Step 1: Write the failing test**

Create `laravel-app/tests/Feature/GameJoinTest.php`:

```php
<?php

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;

test('a user can join an existing game', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', $game));

    $response->assertRedirect(route('games.show', $game));
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeTrue();
});

test('joining a game twice does not create a duplicate row', function () {
    $game = Game::factory()->create(['max_players' => 6]);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('games.join', $game));
    $this->actingAs($user)->post(route('games.join', $game));

    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->count())->toBe(1);
});

test('joining a full game is rejected', function () {
    $game = Game::factory()->create(['max_players' => 3]);
    GamePlayer::factory()->count(3)->create(['game_id' => $game->id]);
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('games.join', $game));

    $response->assertSessionHasErrors('game');
    expect(GamePlayer::where('game_id', $game->id)->where('user_id', $user->id)->exists())->toBeFalse();
});

test('a guest is redirected to login when trying to join', function () {
    $game = Game::factory()->create();

    $response = $this->post(route('games.join', $game));

    $response->assertRedirect(route('login'));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameJoinTest.php`
Expected: FAIL — route `games.join` doesn't exist.

- [ ] **Step 3: Add `join()` to the controller**

In `laravel-app/app/Http/Controllers/GameController.php`, add the import:

```php
use Illuminate\Http\Request;
```

and add this method to the class:

```php
    public function join(Request $request, Game $game)
    {
        $alreadyJoined = $game->players()->where('user_id', $request->user()->id)->exists();

        if (! $alreadyJoined) {
            if ($game->players()->count() >= $game->max_players) {
                return back()->withErrors(['game' => 'This operation roster is already full.']);
            }

            GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $request->user()->id,
                'is_host' => false,
                'status' => 'ready',
                'joined_at' => now(),
            ]);
        }

        return to_route('games.show', $game);
    }
```

- [ ] **Step 4: Add the route**

In `laravel-app/routes/web.php`, inside the `Route::middleware(['auth'])->group(...)` block, add:

```php
    Route::post('games/{game}/join', [GameController::class, 'join'])->name('games.join');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/GameJoinTest.php`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add laravel-app
git commit -m "Add GameController@join"
```

---

### Task 8: `DashboardController@index`, `Dashboard.vue`, create/join forms

**Files:**
- Create: `laravel-app/app/Http/Controllers/DashboardController.php`
- Modify: `laravel-app/routes/web.php`
- Modify: `laravel-app/resources/js/pages/Dashboard.vue`
- Create: `laravel-app/resources/js/components/CreateGameForm.vue`
- Create: `laravel-app/resources/js/components/JoinGameForm.vue`
- Modify: `laravel-app/tests/Feature/DashboardTest.php`

**Interfaces:**
- Consumes: `App\Models\Game`, `App\Models\GamePlayer` (Task 3/4), routes `games.store`/`games.join` (Task 6/7).
- Produces: the `dashboard` route backed by a real controller passing a `games` prop (each with `id`, `code`, `title`, `status`). Nothing later in this phase depends on this task.

- [ ] **Step 1: Write the failing test**

Open `laravel-app/tests/Feature/DashboardTest.php`. It currently reads:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }
}
```

Change the `use App\Models\User;` line to also import `Game` and `GamePlayer`, and add a new test method at the end of the class, just before the closing `}`:

```php
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\User;
```

```php
    public function test_dashboard_lists_the_users_games()
    {
        $user = User::factory()->create();
        $game = Game::factory()->create(['host_id' => $user->id, 'title' => 'Operation Nightfall']);
        GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id, 'is_host' => true]);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('games', 1)
            ->where('games.0.title', 'Operation Nightfall'));
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/DashboardTest.php`
Expected: FAIL — the current `dashboard` route (a bare `Route::inertia()` call) never passes a `games` prop.

- [ ] **Step 3: Create the controller**

Create `laravel-app/app/Http/Controllers/DashboardController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $games = $request->user()
            ->gamePlayers()
            ->with('game.host')
            ->get()
            ->pluck('game')
            ->values();

        return inertia('Dashboard', [
            'games' => $games,
        ]);
    }
}
```

- [ ] **Step 4: Replace the dashboard route**

In `laravel-app/routes/web.php`, add the import:

```php
use App\Http\Controllers\DashboardController;
```

and change:

```php
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
```

to:

```php
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd laravel-app && ./vendor/bin/pest tests/Feature/DashboardTest.php`
Expected: PASS (3 tests).

- [ ] **Step 6: Create the create-game form component**

Create `laravel-app/resources/js/components/CreateGameForm.vue`:

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';

const form = useForm({
    title: '',
    game_mode: 'mole',
    max_players: 6,
    mission_briefing: 'A rogue operative has intercepted intelligence files.',
});

function submit() {
    form.post('/games');
}
</script>

<template>
    <form id="create-game-form" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border" @submit.prevent="submit">
        <h2 class="mb-2 font-semibold">Create Operation</h2>
        <input
            id="input-game-title"
            v-model="form.title"
            type="text"
            placeholder="Operation title"
            class="mb-2 w-full rounded border px-2 py-1"
        />
        <p v-if="form.errors.title" class="mb-2 text-sm text-red-600">{{ form.errors.title }}</p>

        <input
            id="input-max-players"
            v-model.number="form.max_players"
            type="number"
            min="3"
            max="12"
            class="mb-2 w-full rounded border px-2 py-1"
        />
        <p v-if="form.errors.max_players" class="mb-2 text-sm text-red-600">{{ form.errors.max_players }}</p>

        <textarea id="input-mission-briefing" v-model="form.mission_briefing" class="mb-2 w-full rounded border px-2 py-1"></textarea>
        <p v-if="form.errors.mission_briefing" class="mb-2 text-sm text-red-600">{{ form.errors.mission_briefing }}</p>

        <button id="btn-create-game" type="submit" :disabled="form.processing" class="rounded bg-primary px-3 py-1.5 text-primary-foreground">
            Create
        </button>
    </form>
</template>
```

- [ ] **Step 7: Create the join-game form component**

Create `laravel-app/resources/js/components/JoinGameForm.vue`:

```vue
<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';

const form = useForm({
    code: '',
});

function submit() {
    form.post(`/games/${form.code}/join`);
}
</script>

<template>
    <form id="join-game-form" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border" @submit.prevent="submit">
        <h2 class="mb-2 font-semibold">Join Operation</h2>
        <input
            id="input-join-code"
            v-model="form.code"
            type="text"
            placeholder="SPY-XXXX"
            class="mb-2 w-full rounded border px-2 py-1 font-mono uppercase"
        />
        <p v-if="form.errors.game" class="mb-2 text-sm text-red-600">{{ form.errors.game }}</p>
        <button id="btn-join-game" type="submit" :disabled="form.processing" class="rounded bg-primary px-3 py-1.5 text-primary-foreground">
            Join
        </button>
    </form>
</template>
```

- [ ] **Step 8: Replace the Dashboard page content**

Replace the full contents of `laravel-app/resources/js/pages/Dashboard.vue` with:

```vue
<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import CreateGameForm from '@/components/CreateGameForm.vue';
import JoinGameForm from '@/components/JoinGameForm.vue';
import { dashboard } from '@/routes';

interface GameRow {
    id: number;
    code: string;
    title: string;
    status: string;
}

defineProps<{
    games: GameRow[];
}>();

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
</script>

<template>
    <Head title="Dashboard" />

    <div class="flex flex-1 flex-col gap-4 p-4">
        <div class="grid gap-4 md:grid-cols-2">
            <CreateGameForm />
            <JoinGameForm />
        </div>

        <div id="games-list" class="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
            <h2 class="mb-2 font-semibold">Your Operations</h2>
            <ul class="space-y-1">
                <li v-for="game in games" :key="game.id">
                    <Link :href="`/games/${game.code}`" class="font-mono">{{ game.title }} ({{ game.code }})</Link>
                </li>
            </ul>
        </div>
    </div>
</template>
```

- [ ] **Step 9: Run the full Pest suite**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all pass.

- [ ] **Step 10: Verify the frontend builds**

Run: `cd laravel-app && npm run build`
Expected: build succeeds with no TypeScript/Vue compile errors.

- [ ] **Step 11: Commit**

```bash
git add laravel-app
git commit -m "Add DashboardController and create/join game forms"
```

---

### Task 9: Install and configure Cypress for `laravel-app`

**Files:**
- Modify: `laravel-app/package.json`
- Create: `laravel-app/cypress.config.ts`
- Create: `laravel-app/cypress/support/e2e.ts`
- Create: `laravel-app/cypress/support/commands.ts`
- Create: `laravel-app/cypress/tsconfig.json`

**Interfaces:**
- Produces: `cy.registerAgent(name, email, password?)` and `cy.loginAgent(email, password?)` custom commands. Task 10's spec uses both.

- [ ] **Step 1: Install Cypress**

Run: `cd laravel-app && npm install --save-dev cypress`

- [ ] **Step 2: Add a test script**

In `laravel-app/package.json`, add to the `"scripts"` object:

```json
"test:e2e": "cypress run"
```

- [ ] **Step 3: Create the Cypress config**

Create `laravel-app/cypress.config.ts`:

```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:8000',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});
```

- [ ] **Step 4: Create the Cypress tsconfig**

Create `laravel-app/cypress/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "types": ["cypress", "node"],
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 5: Create the support entry**

Create `laravel-app/cypress/support/e2e.ts`:

```ts
import './commands';
```

- [ ] **Step 6: Create custom commands, using verified real field selectors from the starter kit's auth pages**

Create `laravel-app/cypress/support/commands.ts`:

```ts
/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      registerAgent(name: string, email: string, password?: string): Chainable<void>;
      loginAgent(email: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('registerAgent', (name: string, email: string, password = 'password123') => {
  cy.visit('/register');
  cy.get('#name').type(name);
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('#password_confirmation').type(password);
  cy.get('[data-test="register-user-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('loginAgent', (email: string, password = 'password123') => {
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('[data-test="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

export {};
```

- [ ] **Step 7: Verify Cypress installs cleanly**

Run: `cd laravel-app && npx cypress verify`
Expected: succeeds (or reports the same pre-existing local Cypress/Electron incompatibility already known in this environment — if so, note it and continue; this is an environment issue unrelated to the config itself, confirmed separately against this app's config via CI in Task 10).

- [ ] **Step 8: Commit**

```bash
git add laravel-app
git commit -m "Install and configure Cypress for laravel-app"
```

---

### Task 10: End-to-end Cypress spec

**Files:**
- Create: `laravel-app/cypress/e2e/01_auth_and_lobby.cy.ts`
- Create: `laravel-app/.github/workflows/cypress.yml` (or add a job to an existing workflow — see Step 5)

**Interfaces:**
- Consumes: `cy.registerAgent`, `cy.loginAgent` (Task 9); routes/pages from Tasks 5-8.

- [ ] **Step 1: Write the spec**

Create `laravel-app/cypress/e2e/01_auth_and_lobby.cy.ts`:

```ts
describe('Phase 1: auth, game creation, and joining', () => {
  it('registers, creates a game, and lands in its lobby', () => {
    const email = `host_${Date.now()}@example.com`;
    cy.registerAgent('Host Falcon', email);

    cy.get('#input-game-title').type('Operation Nightfall');
    cy.get('#input-mission-briefing').clear().type('Find the mole before time runs out.');
    cy.get('#btn-create-game').click();

    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
    cy.contains('Operation Nightfall').should('be.visible');
    // The roster shows the host's assigned codename (a hash of their name),
    // not their raw name, so assert on the "(Host)" badge instead of guessing it.
    cy.get('#operatives-roster').should('contain', '(Host)');
    cy.get('#game-invite-code')
      .invoke('text')
      .then((code) => {
        cy.wrap(code.trim()).as('inviteCode');
      });
  });

  it('lets a second user join by invite code and appear in the roster after a revisit', () => {
    const hostEmail = `host2_${Date.now()}@example.com`;
    const recruitEmail = `recruit_${Date.now()}@example.com`;

    // Host creates the game
    cy.registerAgent('Host Echo', hostEmail);
    cy.get('#input-game-title').type('Operation Schoolyard');
    cy.get('#input-mission-briefing').clear().type('Find the mole.');
    cy.get('#btn-create-game').click();
    cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');

    cy.get('#game-invite-code')
      .invoke('text')
      .then((rawCode) => {
        const code = rawCode.trim();

        // Second user registers and joins by code
        cy.clearCookies();
        cy.registerAgent('Recruit Ghost', recruitEmail);
        cy.get('#input-join-code').type(code);
        cy.get('#btn-join-game').click();

        cy.get('#lobby-header', { timeout: 8000 }).should('be.visible');
        cy.get('#operatives-roster').should('contain', 'pts'); // roster rendered with the recruit included

        // Host revisits the lobby (no realtime push yet in Phase 1) and sees the recruit
        cy.clearCookies();
        cy.loginAgent(hostEmail);
        cy.visit(`/games/${code}`);
        cy.get('#roster-list').children().should('have.length', 2);
      });
  });
});
```

- [ ] **Step 2: Start the app and run the spec**

Run (two terminals, or backgrounded):

```bash
cd laravel-app && php artisan serve &
cd laravel-app && npm run build && npx cypress run --spec cypress/e2e/01_auth_and_lobby.cy.ts
```

Expected: both tests pass. If Cypress itself cannot launch in this environment (a known pre-existing local macOS/Electron incompatibility unrelated to this config — see the React app's equivalent situation), this step's real verification happens in CI (Step 5); note the local result either way.

- [ ] **Step 3: Stop the dev server**

Run: `kill %1` (or find and kill the `php artisan serve` process another way).

- [ ] **Step 4: Add a CI workflow**

Create `laravel-app/.github/workflows/cypress.yml`:

```yaml
name: Laravel App E2E

on:
  push:
    paths:
      - 'laravel-app/**'

jobs:
  cypress:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: laravel-app

    steps:
      - uses: actions/checkout@v4

      - name: Set up PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: laravel-app/package-lock.json

      - name: Install PHP dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Install Node dependencies
        run: npm ci

      - name: Prepare environment
        run: |
          cp .env.example .env
          php artisan key:generate
          touch database/database.sqlite
          php artisan migrate --force

      - name: Build frontend
        run: npm run build

      - name: Install Cypress's Linux dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2t64 libxtst6 xauth xvfb

      - name: Start Laravel server
        run: |
          php artisan serve --port=8000 &
          npx wait-on http://127.0.0.1:8000

      - name: Run Cypress
        run: npx cypress run

      - name: Upload failure screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: laravel-app-cypress-screenshots
          path: laravel-app/cypress/screenshots
          if-no-files-found: ignore
```

- [ ] **Step 5: Commit**

```bash
git add laravel-app
git commit -m "Add Phase 1 Cypress E2E spec and CI workflow"
```

---

### Task 11: `laravel-app` README and final verification

**Files:**
- Create: `laravel-app/README.md`

**Interfaces:**
- None — this is the phase's wrap-up task.

- [ ] **Step 1: Write the README**

Create `laravel-app/README.md`:

```markdown
# SpyNet Terminal — Laravel/Vue/SQLite Rebuild (Phase 1)

Phase 1 of a phased rebuild of the React/Firebase app at the repo root, in
Laravel 13 + Inertia + Vue 3 + SQLite. See
`../docs/superpowers/specs/2026-09-22-laravel-vue-rebuild-phase1-design.md`
for the full design and phase roadmap.

## What Phase 1 does

Register, log in, create a game, and join a game by its invite code. No
real-time updates, no spies/voting/scoring, no i18n, no locations dataset
— those arrive in later phases.

## Setup

\`\`\`bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm run build
\`\`\`

## Running it

\`\`\`bash
php artisan serve
\`\`\`

Visit http://127.0.0.1:8000.

## Testing

\`\`\`bash
./vendor/bin/pest          # backend
npx cypress run            # E2E (app must be running, see above)
\`\`\`
```

- [ ] **Step 2: Run the full backend suite one more time**

Run: `cd laravel-app && ./vendor/bin/pest`
Expected: all pass.

- [ ] **Step 3: Run the frontend build one more time**

Run: `cd laravel-app && npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add laravel-app
git commit -m "Add laravel-app README for Phase 1"
```

---

## Self-Review Notes

- **Spec coverage:** every Phase 1 spec section has a task — scaffold (Task 1), codename + no email verification (Task 2), `games`/`game_players` data model (Tasks 3-4), the three routes/controller actions (Tasks 5-7), the dashboard + forms (Task 8), Pest coverage (woven through Tasks 2-8), Cypress coverage (Tasks 9-10). The "explicitly out of scope" list (bots, spy assignment, launch, voting, scoring, realtime, i18n, full locations dataset) has no corresponding task, as intended.
- **Task ordering fix:** `show` (Task 5) is sequenced before `store` (Task 6) and `join` (Task 7) specifically because both of the latter redirect to the `games.show` named route — building it first avoids a broken forward-reference.
- **Type/name consistency:** `GamePlayer` (not `GamePlayers` or `Player`) is used consistently from Task 4 onward; `secret_location` (not `location`) matches the spec's column name throughout; `config('locations.names')` is the single place that list is defined, referenced identically in Task 6's controller and test.
