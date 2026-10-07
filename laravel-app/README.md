# SpyNet Terminal — Laravel/Vue rebuild

Phase 1 of a phased rebuild of the React/Firebase app at the repo root, in
Laravel 13 + Inertia + Vue 3 + SQLite. See
`../docs/superpowers/specs/2026-09-22-laravel-vue-rebuild-phase1-design.md`
for the full design and phase roadmap.

## The game

Spy is played in rounds, with the same rules on the web and in the Expo app:

1. The host creates an operation (mode, age group, 3–12 operatives) and
   shares its code. Players join while it is **recruiting**, can mark
   themselves ready, and can leave between rounds.
2. **Starting a round** (host, at least 3 players) draws a secret location
   from the age group's pool and secretly picks the spies (1 for 3–4
   players, 2 for 5–7, then one more per 3 players). Each player sees only
   their own role; loyalists also see the location.
3. During the round a **spy may guess the location** once: right and the
   spies win, wrong and the loyalists win.
4. The host **calls a vote**. Votes can change until voting closes, which
   happens automatically once everyone has voted (or when the host closes
   it). The most-voted player is accused; a tie or no votes lets the spies
   win.
5. Everyone on the winning side scores a point. The host can start the
   next round (scores carry over) or send the game **back to recruiting**,
   which abandons a round in progress without points.

Rules live in `app/Actions/Games`. Role secrecy is enforced by
`RoundResource`, which shapes each round for the requesting player.

The 502 locations (ported from the original SPA, in English and Ukrainian,
with age tiers that include every younger tier) are in
`app/Support/LocationData.php`; their ids are stored in `game_rounds`, so
only ever append to that list.

## Languages

English and Ukrainian. The language is saved on the account
(`users.locale`) so it follows the player across the web, the app and push
notifications; guests choose per session (web) or per device (app), with
`Accept-Language` as the fallback. Translations are keyed by their English
text in `lang/uk.json` (shared with the Vue app as a once-loaded Inertia
prop) and `lang/uk/*.php` for validation and auth messages.

## Real-time presence and invitations

Building on Phase 1, this adds:

- A Pusher-backed presence channel (`online-users`) tracking who's
  currently online, with no persisted "online" column — presence
  channel membership is the live source of truth.
- A pending/accept/decline game-invitation flow: from a game's Lobby
  (host only, while the game is `recruiting`), invite a specific
  registered user. They see it on their Spy page's "Pending
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
invite → Spy page → accept/decline → lobby flow itself is CI-covered:
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
  `me/locale`, `me/password`, `me/push-tokens`, `games/spy`, `games`,
  `games/{code}`, `games/{code}/join|leave|ready|start|voting|votes|tally|guess|reset`,
  `games/{code}/invitable-users`, `games/{code}/invitations`,
  `invitations/{id}/accept|decline`, `locations?tier=`. Every game action
  except `leave` answers with the caller's view of the lobby (`guess`
  wraps it as `{ correct, game }`).
- **Rate limits:** `auth/register` (and the web sign-up form) allow 5
  attempts per minute per IP, except when `APP_ENV=local`.
- **Errors:** 422 responses use Laravel's validation shape
  (`{ message, errors: { field: [..] } }`), including game-rule violations.
- **Real-time:** mobile clients authorize channels at
  `/api/broadcasting/auth`. `PlayerJoined` (`player.joined`) and
  `GameUpdated` (`game.updated`) broadcast on `private-game.{id}` to roster
  members. Neither carries round secrets, so clients refetch the lobby.
- **Push:** devices register Expo push tokens; `InvitationIssued` and
  `RoundStarted` queue push notifications (in each recipient's language)
  through `App\Support\ExpoPush`. Production
  needs a queue worker. Set `EXPO_ACCESS_TOKEN` if Expo enhanced push
  security is enabled.
- **Production (Laravel Cloud):** use a managed database rather than the
  SQLite file, enable a queue worker, configure mail (password resets), and
  set the Pusher variables.
