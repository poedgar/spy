# SpyNet Terminal: Laravel + Vue + MySQL Rebuild — Phase 1 Design

## Context

The existing app (`/`, this repo's root) is a React 19 + Vite + Firebase/Firestore
single-page app: a social deduction "spy" party game. Players authenticate
(fake/demo auth — any username+password works, nothing persisted), create or
join a game lobby, launch a round in which the app randomly assigns one or
more "spies" and a secret location to the non-spy players, run an accusation
vote, and score points across rounds. It supports EN/UK localization and,
as of the most recent feature, three age-tiered difficulty levels
(children/teens/adults) that filter which of ~500 pre-loaded locations can be
drawn as the secret location.

The user asked to recreate this app in **Laravel + Vue + MySQL**. This is a
full architectural rebuild, not a bounded change, and is too large for a
single spec/plan/implementation cycle. It is decomposed into four phases,
each with its own spec and plan:

- **Phase 1 (this document)**: Laravel + Vue + MySQL scaffold, real
  authentication, the core `users`/`games`/`game_players` data model, and a
  basic create/join/view lobby flow. No real-time push, no game logic
  (spies/voting/scoring), no i18n, no locations dataset.
- **Phase 2**: Real-time multiplayer sync via Laravel Reverb + Echo,
  replacing the page-reload-to-see-updates limitation accepted in Phase 1.
- **Phase 3**: Full game-phase logic — bots, spy assignment, game launch,
  accusation voting, scoring, next-round flow. This is the bulk of
  `src/utils/gameStorage.ts`'s logic ported to Laravel models/services.
- **Phase 4**: i18n (EN/UK), the ~500-location dataset seeded into MySQL,
  age-tiered difficulty (children/teens/adults), and invite-link UX polish
  (copy-to-clipboard, priority-invite banner, etc.).

Each phase's spec assumes the previous phases are complete.

## Decisions Already Made (apply to all phases unless a later phase revises them)

- **Frontend wiring**: Inertia.js. Laravel controllers return Vue "pages"
  directly; there is no separate hand-maintained REST/JSON API contract.
- **Authentication**: Real, persisted authentication, backed by a MySQL
  `users` table (not the current app's fake/demo login).
- **Real-time sync** (from Phase 2 onward): Laravel Reverb + Laravel Echo
  (self-hosted WebSockets, no third-party service).
- **Scaffold**: Laravel 13's official Vue starter kit (`laravel new --vue`),
  which ships Inertia + Vue 3 + Tailwind + Pest pre-wired.
- **Location in this repo**: a new `laravel-app/` directory at the repo
  root, sibling to the existing React app (`src/`, `cypress/`, etc.). The
  React app is left untouched; this is a parallel rebuild, not a migration
  that deletes the original.
- **Testing**: Pest for backend feature/unit tests; a separate Cypress E2E
  suite under `laravel-app/cypress/` (distinct from the existing
  `cypress/` suite at the repo root, which continues to test the React app).

## Phase 1 Scope

Build the skeleton: a user can register, log in, create a game, and another
user can join that game by its invite code and appear in the lobby roster.
Nothing about actually *playing* the game (spies, locations, voting,
scoring) exists yet. Roster updates are only visible after a page
visit/action (no push) — this is an explicitly accepted limitation until
Phase 2.

### Data Model

**`users`** (starter-kit default columns: `id`, `name`, `email`,
`email_verified_at`, `password`, `remember_token`, timestamps) plus:

- `codename` (string, not null) — assigned at registration from the same
  wordlist the current app uses client-side today (`SHADOW_FOX`,
  `NIGHT_HAWK`, `CIPHER_NINE`, `GHOST_PROTOCOL`, `VIPER_ONE`,
  `COVERT_RAVEN`), chosen deterministically from a hash of the user's name
  (mod wordlist length), matching the current app's approach so the
  mapping is stable and testable.

**`games`**:

- `id` (bigint, pk)
- `code` (string, unique, not null) — human-facing invite code, format
  `SPY-XXXX` (4 uppercase alphanumeric chars from the same charset the
  current app uses: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, ambiguous
  characters excluded), generated server-side at creation with a uniqueness
  retry loop.
- `title` (string, not null)
- `game_mode` (string, not null) — one of `mole` | `codebreaker` |
  `counterintel`, validated at the controller/request layer (not a DB enum
  column, to keep adding modes later a code-only change).
- `host_id` (FK → `users.id`, not null)
- `max_players` (unsigned tinyint, not null, 3–12)
- `mission_briefing` (text, not null)
- `secret_location` (string, not null) — Phase 1 placeholder value only
  (see "Locations placeholder" below); not actually used for gameplay
  until Phase 3/4.
- `status` (string, not null, default `recruiting`) — one of `recruiting` |
  `active` | `voting` | `completed`. Phase 1 only ever creates games in
  `recruiting` and never transitions them (no launch flow yet).
- timestamps

**`game_players`** (its own model+table, not a bare `belongsToMany` pivot,
because Phase 3 needs per-player-per-game fields like `is_spy` and
per-round score history that don't fit a plain pivot):

- `id` (bigint, pk)
- `game_id` (FK → `games.id`, not null, cascade on delete)
- `user_id` (FK → `users.id`, not null, cascade on delete)
- `is_host` (boolean, not null, default false)
- `status` (string, not null, default `ready`) — `ready` | `pending`
  (mirrors the current app's `Operative.status`; Phase 1 always sets
  `ready` since there's no "pending approval" concept yet)
- `score` (unsigned int, not null, default 0) — unused until Phase 3, but
  included now since it's a `game_players` row concern, not a later
  migration's.
- `joined_at` (timestamp, not null)
- Unique constraint on (`game_id`, `user_id`) — a user can't join the same
  game twice; joining again is a no-op that just redirects to the lobby.

**Locations placeholder**: Phase 1 does NOT seed the ~500-location dataset
(that's Phase 4's job, alongside age tiers). To keep `games.secret_location`
non-null and the create-game form functional, Phase 1 ships a small
hardcoded PHP array of ~15 simple, generic location names
(`Church`, `School`, `Castle`, `Airport`, `Library`, ...) directly in
`GameService` (or a `config/locations.php` array), and `secret_location` is
just a random pick from that array at creation time. This value is
carried over but functionally inert in Phase 1 (nothing reads it to assign
roles or display a "classified dossier" — that UI doesn't exist yet).

### Auth Flow

Starter-kit default auth (register, login, logout, session-based,
email+password, Laravel's built-in validation and hashing) with one
addition: the `RegisteredUserController` (or the starter kit's equivalent
action class) assigns `codename` at creation time, using the wordlist and
hashing scheme described above. No email verification requirement for
Phase 1 (matches the current app's frictionless demo-login feel); this can
be revisited later if the user wants it.

### Routes, Controllers, Pages

| Route | Method | Controller action | Inertia page | Notes |
|---|---|---|---|---|
| `/dashboard` | GET | `DashboardController@index` | `Dashboard.vue` | Lists the authenticated user's games (as host or player), a "Create Game" form, a "Join by code" form. Equivalent of `AgentDashboard.tsx`. |
| `/games` | POST | `GameController@store` | redirect → `/games/{code}` | Creates the game; creates the host's `game_players` row (`is_host: true`) in the same transaction. |
| `/games/{game:code}` | GET | `GameController@show` | `Lobby.vue` | Route-model-bound on `code`, not the numeric id, so URLs read `/games/SPY-AB3D`. Shows the roster. Equivalent of `GameLobbyView.tsx`, launch-button-free. |
| `/games/{game:code}/join` | POST | `GameController@join` | redirect → `/games/{code}` | Adds the authenticated user as a `game_players` row. No-ops (just redirects) if already joined. Rejects (422, flashed error) if `game_players` count ≥ `max_players`. Equivalent of `joinSpyGameAsync`. |

Authorization: only an authenticated user who is either the host or an
existing player, or who supplies a valid invite code via the join form, can
view a lobby — Phase 1 doesn't yet need a Policy class for this (the
`join` action's own checks cover it), but `GameController@show` still
requires auth via middleware.

### Vue Pages/Components (mapping to today's React app, for continuity)

| React (today) | Vue (Phase 1) |
|---|---|
| `App.tsx` (auth gate) | Starter kit's default guest/auth layout + middleware |
| `AgentDashboard.tsx` | `Dashboard.vue` |
| `CreateGameModal.tsx` | A form section on `Dashboard.vue` (or a dedicated `CreateGameForm.vue` component) — a full modal isn't necessary yet; Phase 1 favors a plain inline form over recreating the modal chrome. |
| `GameLobbyView.tsx` | `Lobby.vue` (roster list only; no dossier/voting/results sections yet) |
| `InviteModal.tsx` | Not built yet — the invite code is just shown as plain text on `Lobby.vue`. Copy-to-clipboard/share polish is Phase 4. |

### Testing Plan

**Pest** (`laravel-app/tests/Feature/`):
- Registration assigns a `codename`.
- Creating a game creates the game row and the host's `game_players` row
  (`is_host: true`, `status: ready`) atomically.
- Joining a game as a second user creates their `game_players` row.
- Joining twice is a no-op (still exactly one row for that user).
- Joining a full game is rejected.
- A guest (unauthenticated) is redirected to login from every route above.

**Cypress** (`laravel-app/cypress/e2e/01_auth_and_lobby.cy.ts`):
- Register, land on the dashboard.
- Create a game, land on its lobby, see yourself in the roster.
- Log out, register a second user, join the first game by code, see it in
  the joining user's dashboard and see themself in the lobby roster.
- (Since there's no real-time push yet, the first user seeing the second
  user appear requires a page revisit in the test, mirroring the accepted
  Phase 1 limitation — the test should explicitly re-visit the lobby URL
  rather than expect a live update.)

### Explicitly Out of Scope for Phase 1

Bots, spy assignment, game "launch" (status never leaves `recruiting`),
accusation voting, scoring, round progression, real-time updates
(Reverb/Echo), i18n (English only), the ~500-location dataset, age-tiered
difficulty, invite-link copy/share UI, email verification.

## Risks / Open Questions Carried Into Later Phases

- Phase 2 needs to decide which model events broadcast (new player joined,
  at minimum) and whether `Lobby.vue` subscribes via a private or public
  channel (likely private, scoped to the game, given Phase 1's auth model).
- Phase 3's `game_players.is_spy` / voting tables aren't designed yet —
  Phase 1 deliberately leaves `game_players` schema open to an additive
  migration rather than guessing those columns now.
- Phase 4 will need to decide whether the 500-location dataset is a
  `locations` table (seeded, queryable by `age_tier`) or stays a PHP/config
  array like Phase 1's placeholder — a real table is likely once age-tier
  filtering needs `WHERE age_tier IN (...)` style queries, but that's a
  Phase 4 decision, not this one.
