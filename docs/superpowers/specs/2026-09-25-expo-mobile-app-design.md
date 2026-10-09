# SpyNet Mobile: Expo App + Laravel JSON API — Design

## Context

The Laravel/Vue/SQLite rebuild (`laravel-app/`) now delivers auth with
codename assignment, a multi-game picker with Spy as the only live game,
create/join-by-code, a lobby roster, an Invite Players page with Pusher
presence, and pending invitations with accept/decline and a live toast (see
`2026-09-22-laravel-vue-rebuild-phase1-design.md`,
`2026-09-23-user-directory-presence-invitations-design.md`,
`2026-09-25-multi-game-platform-design.md`). Gameplay (spies, voting,
scoring — the original Phases 3–4) does not exist yet.

The user wants a native mobile app built with Expo, **released to the App
Store and Google Play**, as a second client of the same backend: same
accounts, same games, web and mobile players in the same lobbies.

The Laravel app is Inertia-only by design (Phase 1: "no separate
hand-maintained REST/JSON API contract") and authenticates with Fortify
sessions. A mobile client therefore requires a new, explicit JSON API and
token authentication. This document revises the Phase 1 decision *for
non-browser clients only*: the web app keeps Inertia and sessions unchanged;
a versioned JSON API is added alongside it.

## Decisions Made During Brainstorming

- **Purpose:** a store-released app for players (not a prototype).
- **Feature scope:** parity with the web app's current features, plus push
  notifications for invitations and deep links for invite codes. Gameplay
  stays out of both clients until it is built.
- **Account scope ("practical set"):** register, login, logout, forgot
  password (reset completes in the browser via the existing web page), the
  2FA challenge at login for users who already enabled 2FA on the web, edit
  profile (name, email), change password, delete account. Enabling/disabling
  2FA and passkeys remain web-only.
- **Hosting:** the user deploys `laravel-app` to Laravel Cloud themselves.
  The app reads its API base URL from build-time config.
- **Lobby live-sync:** a new `PlayerJoined` broadcast, consumed by both the
  mobile lobby and the web `Lobby.vue`.
- **Look and feel:** mirror the web app's theme tokens and spy wording, built
  with plain React Native `StyleSheet` and a small shared theme module — no
  UI kit dependency.
- **Backend architecture (Approach 1):** extract business rules from today's
  controllers into shared Action classes; the existing Inertia controllers
  and new `Api\*` controllers both call them.

## Non-Goals

Gameplay (bots, spy assignment, launch, voting, scoring), i18n, passkeys,
enabling/disabling 2FA in the app, universal links / app links (custom
scheme only in this release), CI pipelines, and performing the actual store
submission and review (the user runs `eas submit`).

## Part 1 — Backend (`laravel-app/`)

### Shared Actions

New single-purpose classes, each with one public `handle()` method:

| Action | Extracted from | Behaviour |
|---|---|---|
| `App\Actions\Games\CreateGame` | `GameController::store` | Transactionally creates the game (`code`, random `secret_location`, `host_id`, `game_type = 'spy'`) and the host's `game_players` row. Returns the `Game`. |
| `App\Actions\Games\JoinGame` | `GameController::join` | Looks up by code, no-ops if already joined, rejects a full roster, creates the `game_players` row, dispatches `PlayerJoined` for a genuinely new row. Returns the `Game`. |
| `App\Actions\Invitations\SendInvitation` | `InvitationController::store` | Host/recruiting checks, self-invite, already-rostered and full-roster rejections, `updateOrCreate` to `pending`, best-effort `InvitationSent` broadcast. Returns the `Invitation`. |
| `App\Actions\Invitations\AcceptInvitation` | `InvitationController::accept` | Recipient check, pending/recruiting/full-roster checks, already-joined guard, transactional roster insert + status update, dispatches `PlayerJoined` for a genuinely new row. Returns the `Game`. |
| `App\Actions\Invitations\DeclineInvitation` | `InvitationController::decline` | Recipient check, marks `declined` if pending. |
| `App\Actions\DeleteUser` | `Settings\ProfileController::destroy` | Deletes the user (cascades remove `game_players`, invitations, tokens, push tokens). Session invalidation stays in the web controller. |

**Error contract:** a rule violation throws `App\Exceptions\GameRuleException`
carrying a `field` and a `message` (the same message strings used today,
e.g. "This operation roster is already full."). Authorization failures
(not host, not recipient) stay as `abort(403)`. The web controllers catch
`GameRuleException` and return `back()->withErrors([$field => $message])`,
so web behaviour is byte-for-byte unchanged. In API requests the exception
renders as a 422 in Laravel's standard validation shape
(`{ message, errors: { field: [message] } }`), via the exception's
`render()` method.

`InvitationController::index`'s user listing and `DashboardController::spy`'s
queries are extracted into query methods reused by both controller layers
(on the models or small `App\Queries\*` classes — implementation detail for
the plan), so the API and web never disagree about who is invitable or what
counts as "your games."

Registration keeps using Fortify's existing `App\Actions\Fortify\CreateNewUser`
(which already assigns the codename).

### Token Auth: Laravel Sanctum

`php artisan install:api` adds Sanctum and `routes/api.php`. All API routes
live under the `/api/v1` prefix. `User` gains the `HasApiTokens` trait.
Web session auth is untouched.

| Method & path | Auth | Behaviour |
|---|---|---|
| `POST /auth/register` | guest | `{ name, email, password, password_confirmation, device_name }` → `CreateNewUser` → `201 { token, user }`. |
| `POST /auth/login` | guest, `throttle:6,1` | `{ email, password, device_name }`. Invalid credentials → 422 on `email`. If the user has **no** confirmed 2FA (`two_factor_confirmed_at` null) → `{ token, user }`. If they **do** → `{ two_factor: true, challenge }` and no token; `challenge` is a random 40-char string cached for 5 minutes mapping to `{ user_id, device_name }`. |
| `POST /auth/two-factor` | guest, `throttle:6,1` | `{ challenge, code }` or `{ challenge, recovery_code }`. Unknown/expired challenge → 422 on `challenge`. The TOTP code is verified with Fortify's `TwoFactorAuthenticationProvider`; a recovery code is checked against and then replaced in the user's recovery codes (`replaceRecoveryCode`), matching Fortify's web behaviour. Success deletes the challenge and returns `{ token, user }`. |
| `POST /auth/forgot-password` | guest, throttled | `{ email }` → `Password::sendResetLink`. Always returns 200 with a generic message (no account enumeration). The emailed link opens the existing web reset page. |
| `POST /auth/logout` | sanctum | Deletes the current access token (its push tokens are removed by FK cascade). `204`. |
| `GET /me` | sanctum | `UserResource`. |
| `PATCH /me` | sanctum | `{ name, email }` via the existing `ProfileUpdateRequest` rules. |
| `PUT /me/password` | sanctum, `throttle:6,1` | `{ current_password, password, password_confirmation }` via the existing password rules. Other tokens of the user are left alone. |
| `DELETE /me` | sanctum | `{ password }` (must match current password) → `DeleteUser`. `204`. |

Token name = `device_name`. Tokens do not expire by default
(`sanctum.expiration` null); they are revoked on logout or account deletion.

### Game & Invitation Endpoints (all `auth:sanctum`)

| Method & path | Mirrors | Response |
|---|---|---|
| `GET /games/spy` | `DashboardController::spy` | `{ games: GameResource[], pending_invitations: InvitationResource[] }` |
| `POST /games` | `GameController::store` | `201 GameResource` (validated by existing `StoreGameRequest`) |
| `GET /games/{code}` | `GameController::show` | `GameResource` with `players` and `host`. `secret_location` never serialized. 403 if the user is not in the roster (see below). |
| `POST /games/{code}/join` | `GameController::join` | `GameResource`; 404 for unknown code; 422 for full roster. |
| `GET /games/{code}/invitable-users` | `InvitationController::index` | `UserResource[]` each with `invite_status: null \| 'pending'`; 403 unless host and recruiting. Sorted by name; online-first is client-side. |
| `POST /games/{code}/invitations` | `InvitationController::store` | `{ to_user_id }` → `201 InvitationResource`; 403/422 per existing rules. |
| `POST /invitations/{id}/accept` | `InvitationController::accept` | `GameResource`; 403/422 per existing rules. |
| `POST /invitations/{id}/decline` | `InvitationController::decline` | `204`. |

**Lobby visibility (API only):** the web `show` currently lets any
authenticated user with the code view a lobby. The API's `GET /games/{code}`
returns 403 for non-members so the app can offer an explicit "Join" action;
this aligns with the `game.{id}` channel authorization below. The web
behaviour is not changed by this spec.

**API Resources** (`app/Http/Resources/`): `UserResource` (`id`, `name`,
`codename`; `email` only when the resource is the authenticated user),
`GameResource` (`id`, `code`, `title`, `game_type`, `game_mode`,
`max_players`, `mission_briefing`, `status`, `host_id`, `player_count`,
`created_at`, plus `host`/`players` when loaded), `PlayerResource` (`id`,
`user` as `UserResource`, `is_host`, `status`, `joined_at`),
`InvitationResource` (`id`, `status`, `game_title`, `game_code`,
`from_codename`, `created_at`).

**Status codes:** 401 unauthenticated, 403 unauthorized, 404 not found,
422 validation or `GameRuleException`, 429 throttled.

### Real-Time

- **Broadcast auth for tokens:** `Broadcast::routes(['prefix' => 'api',
  'middleware' => ['auth:sanctum']])` exposes `POST /api/broadcasting/auth`
  alongside the existing session-based `/broadcasting/auth`.
- **New channel** in `routes/channels.php`: `game.{game}` authorizes a user
  only if they have a `game_players` row for that game.
- **New event `App\Events\PlayerJoined`** (`ShouldBroadcastNow`,
  `broadcastAs(): 'player.joined'`) on `private-game.{id}`. Payload:
  `{ player: PlayerResource, player_count }`. Dispatched by `JoinGame` and
  `AcceptInvitation` only when a new roster row is created, after the
  transaction commits, wrapped in the same best-effort `try/catch` +
  `report()` pattern `InvitationController::store` uses today.
- **Web `Lobby.vue`:** new composable `resources/js/composables/useGameChannel.ts`
  subscribes to `private-game.{id}` while the lobby is mounted and calls
  `router.reload({ only: ['game'] })` on `player.joined`. It leaves the
  channel on unmount.

### Push Notifications (Expo Push Service)

- **Table `push_tokens`:** `id`, `user_id` (FK → users, cascade),
  `personal_access_token_id` (FK → personal_access_tokens, nullable,
  cascade), `token` (string, unique — an `ExponentPushToken[...]`),
  `platform` (`ios` | `android`), timestamps. Model `App\Models\PushToken`;
  `User::pushTokens()` has-many.
- **Endpoints:** `POST /me/push-tokens` `{ token, platform }` upserts on
  `token` (reassigning it to the current user and access token if it
  existed); `DELETE /me/push-tokens/{token}` deletes it if owned by the
  user. Both `auth:sanctum`.
- **Delivery:** queued listener `App\Listeners\SendInvitationPushNotification`
  (`ShouldQueue`) on `InvitationSent`. For each of the invitee's push tokens
  it POSTs, in one batched request, to
  `https://exp.host/--/api/v2/push/send` via Laravel's `Http` client, with
  `Authorization: Bearer {EXPO_ACCESS_TOKEN}` when that env var is set
  (config key `services.expo.access_token`). Message: title
  `New operation invite`, body `{from_codename} invited you to {game_title}`,
  `sound: default`, `data: { type: 'invitation', invitation_id, code }`.
  Tickets with `details.error === 'DeviceNotRegistered'` delete that token.
  HTTP failures are reported, not retried beyond the queue's default.
- Pushes are sent regardless of presence; the app suppresses OS banners
  while foregrounded and shows its own in-app banner instead.
- Queue: `QUEUE_CONNECTION=sync` works for local dev; production (Laravel
  Cloud) needs a queue worker enabled.

## Part 2 — Mobile App (`expo-app/`)

A new directory at the repo root, sibling to `laravel-app/`, scaffolded
with `create-expo-app` (TypeScript template, latest Expo SDK at scaffold
time). The existing React app and `laravel-app` are not otherwise affected.

### Stack

Expo Router (file-based navigation, typed routes, deep linking) ·
TanStack Query (server state) · `react-hook-form` (forms) ·
`expo-secure-store` (token storage) · `laravel-echo` + `pusher-js`
(React Native build) · `expo-notifications` + `expo-device` (push) ·
`expo-linking` · React Native `Share` API · `StyleSheet` + a local theme
module (no UI kit).

### Configuration

`app.config.ts` reads `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PUSHER_KEY`,
`EXPO_PUBLIC_PUSHER_CLUSTER`. App name `SpyNet`, scheme `spynet`, iOS
`bundleIdentifier` and Android `package` both set to the placeholder
`com.poedgar.marvelousgames` (the user replaces them before first submit), the
`expo-notifications` plugin, an Android notification channel `invitations`,
and placeholder icon/splash assets in the web's neutral palette (to be
replaced with real artwork). `eas.json` defines `development` (dev client,
internal), `preview` (internal distribution), and `production` (store,
`autoIncrement` build numbers) profiles, each with its own env values.

### Screens (`app/`)

| Route | Screen |
|---|---|
| `_layout.tsx` | Providers (Query, Auth, Realtime, Notifications, theme). Redirects between `(auth)` and `(app)` based on auth state; holds a pending deep link while logged out and resumes it after login. |
| `(auth)/welcome` | App name, Log in / Register buttons. |
| `(auth)/login` | Email, password. On `two_factor: true` navigates to `two-factor` with the challenge. |
| `(auth)/two-factor` | Code entry, toggle to recovery code. |
| `(auth)/register` | Name, email, password, confirm. |
| `(auth)/forgot-password` | Email → generic confirmation message. |
| `(app)/index` | Game picker: Spy tile + two greyed, non-pressable "Coming Soon" tiles. Header link to settings. |
| `(app)/spy/index` | Pending invitations (Accept → lobby; Decline → removes row) and "Your Operations" list (→ lobby). Pull-to-refresh; buttons to Create and Join. |
| `(app)/spy/create` | Title, mode (mole / codebreaker / counterintel), max players (3–12), briefing. Success → lobby. |
| `(app)/spy/join` | Code input (auto-uppercased); pre-filled from `spynet://join/{code}`, where it asks for confirmation rather than auto-joining. Success → lobby. |
| `(app)/games/[code]/index` | Lobby: title, mode, briefing, invite code with Share button (message: code + `spynet://join/{code}`), roster with host badge and online dot, "Invite Players" button for the host while recruiting. Live via `player.joined`; also refetches on focus, app foreground, and pull-to-refresh. A 403 shows "You're not on this operation" with a Join button. |
| `(app)/games/[code]/invite` | Host-only list of invitable users: online first, then by name; each row shows an Invite button or a "Pending" badge. Re-sorts live as presence changes. |
| `(app)/settings/index` | Links to profile, password, delete account; Log out. |
| `(app)/settings/profile` · `password` · `delete-account` | Forms for `PATCH /me`, `PUT /me/password`, `DELETE /me` (password-confirmed, destructive-styled, then signs out). |

### Modules (`src/`)

- **`api/client.ts`** — `fetch` wrapper: base URL, `Accept: application/json`,
  Bearer token. 401 → triggers `AuthProvider` sign-out. 422 → throws
  `ValidationError` with `fieldErrors`. Network failure → throws
  `NetworkError`. Other non-2xx → `ApiError` with status.
- **`api/*.ts`** — typed request functions per resource (`auth`, `me`,
  `games`, `invitations`, `pushTokens`) with TypeScript types mirroring the
  API Resources, and TanStack Query hooks built on them. Mutations
  invalidate the affected queries (e.g. accept → `spyHome`, `game(code)`).
- **`auth/AuthProvider.tsx`** — state `loading | signedOut | signedIn`,
  token in `expo-secure-store`, restores the session at launch via `GET /me`,
  exposes `login`, `completeTwoFactor`, `register`, `logout`. Logout calls
  the API, clears secure storage, disconnects Echo, clears the query cache.
- **`realtime/echo.ts`** — creates the Echo instance with a custom
  `authorizer` posting to `/api/broadcasting/auth` with the Bearer token.
  Connects when signed in; disconnects on sign-out and when the app goes to
  the background, reconnects in the foreground.
- **`realtime/usePresence.ts`** — joins `online-users` app-wide, exposes a
  `Set<number>` of online user IDs.
- **`realtime/useUserChannel.ts`** — `private-user.{id}`: on
  `invitation.sent`, shows the in-app banner and invalidates `spyHome`.
- **`realtime/useGameChannel.ts`** — `private-game.{id}` while a lobby
  screen is focused: on `player.joined`, invalidates `game(code)`.
- **`notifications/`** — asks permission once, after first sign-in (not at
  launch); gets the Expo push token (physical devices only) and
  `POST /me/push-tokens`; foreground handler suppresses the OS banner; tap
  handler navigates to `(app)/spy` and highlights `invitation_id`.
- **`linking.ts`** — parses `spynet://join/{code}` (validates the
  `SPY-XXXX` format) into a route.
- **`theme/`** — light and dark color tokens copied from
  `laravel-app/resources/css/app.css` (`--background`, `--foreground`,
  `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, ...),
  selected by the system color scheme; spacing and type scales.
- **`components/`** — `Screen`, `Button` (primary/secondary/destructive,
  loading state), `TextField` (label + field error), `Card`, `Badge`,
  `OnlineDot`, `Banner`, `FormError`, `EmptyState`.

### Error Handling

422 errors map onto form fields via `react-hook-form`'s `setError`
(errors on non-field keys like `invitation` or `code` render in a
`FormError` above the form or as a banner). `NetworkError` shows a
dismissible "Can't reach SpyNet" banner with Retry. Queries retry twice on
network errors and never on 4xx. The app never shows raw server error text
for 5xx; it shows a generic message.

## Testing

### Backend (Pest)

- **Refactor safety:** the existing web feature tests for games,
  invitations, dashboard and profile pass unchanged after the Action
  extraction, and the Cypress specs `01`–`03` stay green.
- **Action unit/feature tests:** each rule violation throws
  `GameRuleException` with the expected field and message; `PlayerJoined`
  is dispatched for a new join or accept and not for the already-joined
  no-op (`Event::fake()`).
- **API feature tests** (`tests/Feature/Api/`): register and login return
  tokens; login for a 2FA user returns a challenge and no token; the right
  TOTP code or a recovery code (which is then consumed) returns a token;
  wrong code, reused recovery code, and expired or unknown challenge are
  rejected; forgot-password returns the same response for known and
  unknown emails; logout revokes the token and cascades its push tokens;
  profile, password and delete-account (with a wrong password rejected);
  every game and invitation endpoint with the same happy and unhappy cases
  as its web counterpart plus `assertJsonStructure` on the Resource shape
  and absence of `secret_location`; 401 without a token; 403 on the lobby
  for non-members.
- **Channels:** `game.{id}` authorizes roster members and rejects others;
  token-based `/api/broadcasting/auth` works.
- **Push:** `Queue::fake()` asserts the listener is queued on
  `InvitationSent`; `Http::fake()` asserts the Expo payload, no request when
  the invitee has no tokens, and deletion of a token reported as
  `DeviceNotRegistered`. Push-token register (upsert/reassignment) and
  delete endpoints.

### Web

The live `player.joined` lobby refresh is manually verified, for the same
reason `02_invitations`' presence/toast behaviour is: CI would need real
Pusher credentials and two live sessions.

### Expo App

- **Jest + React Native Testing Library** (`jest-expo` preset): API client
  (auth header, 401 sign-out, 422 → `ValidationError`, network error);
  `AuthProvider` (restore from secure store, 2FA branch, logout clears
  state); deep-link parsing; screens with a mocked API — login's 2FA branch,
  create-game field errors, join's full-roster error, lobby refetch when a
  mocked `player.joined` fires, invite list ordering by presence, delete
  account signs out.
- **Static checks:** `tsc --noEmit` and `expo lint` are part of the app's
  `test` script.
- **E2E:** Maestro flows under `expo-app/.maestro/` against a dev build and
  a local backend: register → create game; second user → join by code;
  host invites → second user accepts → lands in lobby. Runnable locally;
  not wired into CI in this release.
- **Manual (pre-submission checklist):** push delivery and tap-navigation
  on a physical iOS and Android device, presence dots and live lobby across
  two devices, deep link from the share sheet, 2FA login, account deletion.

## Release

Delivered in this project:
- `eas.json` and `app.config.ts` as above.
- `expo-app/RELEASE.md`: EAS build/submit commands per profile, required
  environment variables, credentials setup, and the pre-submission
  checklist.

Prerequisites the user provides:
- **Laravel Cloud deployment** of `laravel-app` with a public HTTPS URL, a
  managed database (Laravel Cloud's filesystem is not durable storage for
  the SQLite file; the app uses nothing SQLite-specific, so this is config
  only), a queue worker, working mail for password resets, and the Pusher
  env vars (plus `EXPO_ACCESS_TOKEN` if enhanced push security is enabled).
- Apple Developer account, Google Play Console account, Expo account.
- Android FCM credentials uploaded to EAS (APNs is generated by EAS via the
  Apple account).
- Final bundle ID / package name, icon and splash artwork, a privacy policy
  URL, store listing text and screenshots.

## Risks / Follow-Ups

- **Universal links / app links** (`https://<domain>/join/{code}` opening the
  app) need `apple-app-site-association` and `assetlinks.json` served by
  Laravel on the production domain — a follow-up once the domain is known.
- **Web lobby visibility** remains open to any authenticated user with the
  code, while the API restricts it to members; aligning the web is a small
  separate decision.
- **Gameplay (Phases 3–4)** will be built once in the Actions/API layer
  established here, then surfaced in both clients.
- **Expo SDK upgrades** happen roughly three times a year; the app should be
  kept within the store-supported SDK window.
