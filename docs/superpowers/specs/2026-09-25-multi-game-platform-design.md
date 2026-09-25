# Multi-Game Platform (Spy as the First Game) — Design

## Context

The Laravel/Vue/SQLite rebuild has so far assumed the platform hosts exactly
one game: Spy (the social-deduction party game from Phase 1, extended with
presence/invitations in Phase 2). The user now wants the platform framed as
a **multi-game platform**, of which Spy is the first available game. Other
games will be designed and built later — this change only needs to make
room for them, not implement any of them.

## Goals

- Introduce a game picker as the account home page, showing Spy as a
  playable option and a couple of "Coming Soon" placeholders for future
  games.
- Move today's Dashboard content (create/join a Spy game, your operations,
  pending invitations) to a Spy-specific page, reached by picking Spy from
  the picker.
- Reserve a `game_type` concept in the data model so a future second game
  can reuse the `games` table, without building out any per-type rule
  system (player minimums, teams, etc.) that only Spy would exercise today.

## Non-Goals

- Designing or implementing any second game.
- A generic per-game-type rules engine (min/max players, team/group
  structures). The user explicitly deferred this: Spy keeps its existing
  flat-roster, `max_players` model. This gets revisited when an actual
  second game needs different rules.
- Any change to game creation/join/lobby mechanics, invitations, presence,
  or broadcasting — all of that is already generic over "a game" and
  untouched by this work.

## Routing & Page Split

- The `dashboard` route (URI `/dashboard`) becomes the **game picker**.
  This is unchanged as Fortify's configured post-login/post-registration
  redirect (`config/fortify.php`'s `'home' => '/dashboard'`), so a fresh
  session naturally lands on "which game do you want to play."
- A new route, name `games.spy`, URI `/games/spy`, hosts everything that's
  on today's Dashboard: `CreateGameForm`, `JoinGameForm`, "Your Operations"
  list, and "Pending Invitations".
- `InvitationController::decline()` changes its redirect from
  `to_route('dashboard')` to `to_route('games.spy')` — the user declining
  an invitation is already in the Spy context, not looking for the picker.
- No other redirect call-sites need to change: `GameController::store()`
  and `GameController::join()` already redirect to `games.show` (a
  specific game's lobby), and `InvitationController::accept()` does the
  same — none of these assume "dashboard" means "Spy's home."

## Data Model

- Add a `game_type` column to the `games` table (string). No database
  default — it's set explicitly by whichever controller creates a game,
  so a future second game type can't silently inherit `'spy'` from an
  unnoticed column default.
- `GameController::store()` sets `'game_type' => 'spy'` explicitly (today
  it's the only path that creates games).
- No other schema changes. `max_players`, the roster model, and everything
  else on `games`/`game_players` stays exactly as it is.
- The picker page does not query `games` at all — the list of available
  games (Spy = live, others = "Coming Soon") is static, not derived from
  existing game rows.

## UI & Component Structure

- The picker reuses the existing `Dashboard.vue` file and `dashboard`
  route. Its content is replaced with a grid of game tiles: one **Spy**
  tile linking to `/games/spy`, plus two generic, unclickable, greyed-out
  **"Coming Soon"** tiles (static markup, no backing data).
- Today's actual Dashboard content moves into a new page,
  `resources/js/pages/games/Spy.vue` — matching this app's existing
  convention of keeping game-related pages under `games/` (alongside
  `Lobby.vue`, `InviteUsers.vue`).
- `DashboardController` gains a second method, `spy()`, containing exactly
  the query logic `index()` has today (the user's games + their pending
  invitations), rendering the new page. `index()` itself becomes the
  picker's trivial rendering logic — no query needed.
- `usePresence()` and `useInvitationNotifications()` are unaffected: they
  already mount app-wide from `AppLayout.vue`, independent of which page
  is showing.

## Testing Scope

- Backend: a Pest test confirming `GameController::store()` sets
  `game_type` to `'spy'` on the created row; a Pest test confirming the
  picker route renders without querying `games`/`invitations` (or simply
  that it renders the expected Inertia component with no props coupling
  to game data); a Pest test confirming `DashboardController::spy()`
  renders the moved content with the same shape as today's `index()` test
  already covers (games + pendingInvitations).
- Frontend/Cypress: the existing `01_auth_and_lobby.cy.ts` and
  `02_invitations.cy.ts` specs currently assume Dashboard IS the Spy page
  (e.g. `cy.get('#input-game-title')` right after registration/login) —
  these need their navigation updated to click through the picker's Spy
  tile first, or navigate directly to `/games/spy`. This is an existing-test
  update, not new coverage, and is naturally part of the plan (whichever
  task moves the create/join form is the task that must also fix these
  specs, or a dedicated task should be added to touch both files together).
- No coverage is needed for the "Coming Soon" tiles beyond confirming they
  render and are not clickable/don't navigate anywhere — this is a
  cosmetic, static feature.
