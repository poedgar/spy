# Marvelous Games — Laravel/Vue app

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

## Phrase

The second game, played on the same lobby, invitation and readiness
machinery (`games.game_type` is `spy` or `phrase`; Spy-only and Phrase-only
actions refuse the other game):

1. The host creates a game, picks the phrase language (English or
   Ukrainian pool) and a table of 3–10 players.
2. **Dealing** picks a well-known phrase with at least as many words as
   players (preferring ones this game hasn't played) and gives every player
   a different word of it, with its position; the rest stay hidden.
3. Questions are asked **out loud**. The app shows whose turn it is; the
   asker (or the host) passes the turn, and a question round ends when
   everyone has asked.
4. Anyone can **guess the whole phrase** at any time. Matching ignores
   case, punctuation, apostrophe styles and hyphens. A right guess ends the
   phrase and scores +3; a wrong one costs 1 point (scores can go
   negative) and play goes on. Guesses are visible to everyone.
5. The host deals the next phrase (scores carry over) or goes back to
   recruiting.

Rules live in `app/Actions/Phrase`; `PhraseRoundResource` hides the phrase
and other players' words until a phrase ends. The pools are in
`app/Support/PhraseData.php` — append only, and keep enough phrases of 10+
words for the largest tables (a test checks this).

## Lobbies

Shared by both games (`app/Actions/Lobby`):

- **Inviting:** hosts are offered people they've played with before, and
  can search anyone by name or codename (2+ characters, 20 results). The
  full user list is never exposed. Invitations that weren't accepted stay
  visible to the host, who can send them again or cancel them.
- **Open games:** each game's home lists listed, recruiting games with a
  free seat. Anyone can ask to join one; the request always goes to the
  host, who lets them in or declines (they can cancel, or ask again after a
  decline). Games are listed by default; the host can unlist one so only
  people with the code or an invitation can get in.
- **Approving players:** with "approve new players" on, joining by code
  creates a request the host lets in or declines (invited players skip
  it). The host is pushed about requests; the player is told live (and
  pushed when approved). Joining is rate limited to 20 attempts a minute.
- **Hosts:** a host can hand over hosting, remove players between rounds,
  and leave — hosting passes to the longest-standing player, and the last
  player out closes the game. Deleting an account hands its games over the
  same way instead of deleting them for everyone.
- **Codenames** are unique: generated from 1,600 word pairs at sign-up and
  editable in the profile. A migration renamed existing duplicates.
- **Invitation emails** go out (queued, in the invitee's language) unless
  the player switches them off in their profile. Configure `MAIL_*` in
  production; locally mail goes to the log.

## Rounds, timers and history

- **Round timer:** hosts can pick 3/5/8/10-minute rounds when creating a game
  (Codebreaker suggests 8). When time is up a Spy round moves to the vote and
  a Phrase deal is revealed with no winner. The server applies the timer
  whenever a lobby is loaded (`EnforceRoundTimer`), so it needs no worker;
  clients reload when their countdown hits zero.
- **Reveal and end:** a Phrase host can show the phrase and end a deal
  nobody is getting, without points.
- **History:** lobbies list the last ten finished rounds.
- **Closing a game:** the host can delete a game; players are notified and
  open lobbies send them home.

## Accounts and limits

- New accounts get a verification email. Playing doesn't require it, but
  invitation emails only go to verified addresses (anyone can sign up with
  someone else's email). Changing your email sends a new link.
- Re-inviting the same player waits 10 minutes, and invitations are capped
  at 10 a minute / 60 an hour per host — each one pushes and emails someone.
- Mobile sign-ins expire after 90 days (`SANCTUM_TOKEN_EXPIRATION`).
- `app:prune-old-data` runs daily (see `routes/console.php`): read
  notifications after 60 days, all after 180, answered join requests after
  30, and games untouched for 90 days. Recruiting games with no activity for
  12 hours drop out of open games.

## Languages

English and Ukrainian. The language is saved on the account
(`users.locale`) so it follows the player across the web, the app and push
notifications; guests choose per session (web) or per device (app), with
`Accept-Language` as the fallback. Translations are keyed by their English
text in `lang/uk.json` (shared with the Vue app as a once-loaded Inertia
prop) and `lang/uk/*.php` for validation and auth messages. That covers
Laravel's own text too: password-reset and verification emails, the email
layout and the error pages (which use a `locale` cookie, since a 404 for an
unknown URL never reaches the session).

## Real-time presence and invitations

Building on Phase 1, this adds:

- A Pusher-backed presence channel (`online-users`) tracking who's
  currently online. The server also notes each user's `last_seen_at`
  (at most once a minute), so the invite list can show who is online
  even without Pusher: active in the last 5 minutes counts.
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

## Voice chat

Players in a game can talk in its lobby (web and mobile). Audio runs on
[LiveKit](https://livekit.io), never through this server: Laravel only
signs a short-lived token for players of the game
(`GET /games/{code}/voice`, and `/api/v1/games/{code}/voice` for the
app), scoped to that game's room and to the microphone.

It is off until `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
are set; games report `voice_enabled` so the apps show the panel only
then. LiveKit Cloud's free plan is enough to start (create a project,
copy its URL, e.g. `wss://….livekit.cloud`, and an API key and secret).
The web app loads the LiveKit client only when someone joins.

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
  `games/phrase` (GET home, POST create),
  `games/{code}/phrase/start|turn|guess`,
  `games/{code}/invitable-users`, `games/{code}/invitations`,
  `invitations/{id}/accept|decline`, `locations?tier=`. Every game action
  except `leave` answers with the caller's view of the lobby (both
  `guess` endpoints wrap it as `{ correct, game }`).
- **Rate limits:** `auth/register` (and the web sign-up form) allow 5
  attempts per minute per IP, except when `APP_ENV=local`.
- **Errors:** 422 responses use Laravel's validation shape
  (`{ message, errors: { field: [..] } }`), including game-rule violations.
- **Real-time setup:** without Pusher credentials nothing is pushed live.
  Set `PUSHER_APP_ID/KEY/SECRET/CLUSTER` (or `PUSHER_HOST/PORT/SCHEME` for a
  self-hosted Pusher-compatible server such as Reverb) **before building the
  front end** — the `VITE_PUSHER_*` values are baked in at build time. Lobbies
  fall back to refreshing every 5 seconds while the socket is down, and catch
  up once it reconnects, so they stay correct (just slower) without it.
- **Real-time:** mobile clients authorize channels at
  `/api/broadcasting/auth`. `PlayerJoined` (`player.joined`) and
  `GameUpdated` (`game.updated`) broadcast on `private-game.{id}` to roster
  members. Neither carries round secrets, so clients refetch the lobby.
- **Notifications** (`app/Notifications`): invitations, join requests and
  answers, round starts, removals and host handovers. Each is stored in the
  `notifications` table straight away (the bell on web and mobile), and
  delivered live on `private-user.{id}`, by Expo push and, for invitations,
  by email unless the player turned emails off. Only the kind and its
  parameters are stored; `NotificationPresenter` renders the text and link
  in the reader's language. Live, push and mail delivery are queued, so
  production needs a queue worker; the bell works without one. Production
  needs a queue worker. Set `EXPO_ACCESS_TOKEN` if Expo enhanced push
  security is enabled.
- **Production (Laravel Cloud):** use a managed database rather than the
  SQLite file, enable a queue worker, configure mail (password resets), and
  set the Pusher variables.
