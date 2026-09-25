# SpyNet Terminal — Laravel/Vue/SQLite Rebuild (Phase 1)

Phase 1 of a phased rebuild of the React/Firebase app at the repo root, in
Laravel 13 + Inertia + Vue 3 + SQLite. See
`../docs/superpowers/specs/2026-09-22-laravel-vue-rebuild-phase1-design.md`
for the full design and phase roadmap.

## What Phase 1 does

Register, log in, create a game, and join a game by its invite code. No
real-time updates, no spies/voting/scoring, no i18n, no locations dataset
— those arrive in later phases.

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

**Works without a real Pusher account, but presence/live-toast need one.**
Set `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, and
`PUSHER_APP_CLUSTER` in your `.env` (see `.env.example`) for the presence
dot and live toast to actually reach a browser. Sending an invitation
never fails outright if Pusher is unreachable or misconfigured, though —
the invitation is saved and the request succeeds either way; only the
best-effort live broadcast is skipped, and the failure is logged.

The live presence dot and live toast are **not** covered by the Cypress
CI suite (would require real Pusher credentials as CI secrets and two
simultaneous authenticated sessions) — verify those manually. The
invite → dashboard → accept/decline → lobby flow itself is CI-covered:
it never depends on Pusher connectivity, since sending an invitation
succeeds whether or not the broadcast does.

## Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm run build
```

## Running it

```bash
php artisan serve
```

Visit http://127.0.0.1:8000.

## Testing

```bash
./vendor/bin/pest          # backend
npx cypress run            # E2E (app must be running, see above)
```
