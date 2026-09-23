# Laravel App: User Directory, Presence & Game Invitations — Design

## Context

Phase 1 of the Laravel/Vue/SQLite rebuild (see
`docs/superpowers/specs/2026-09-22-laravel-vue-rebuild-phase1-design.md` and
its implementation plan) delivered auth, the `users`/`games`/`game_players`
data model, and a create/join-by-code/view-lobby flow, explicitly *without*
any real-time infrastructure — that was deferred to a planned "Phase 2:
real-time multiplayer sync via Laravel Reverb + Echo."

This document supersedes that Phase 2 plan. The user asked for a new
feature — a page listing all registered users (online users sorted first)
that a game's host can use to send that user an invitation to join — and
during brainstorming it became clear this pulls real-time infrastructure
forward (to actually track "online" status and to notify a user promptly
of a new invitation) and introduces a new invitations subsystem that
wasn't part of the original phase breakdown. Two decisions were made
during brainstorming that revise the original plan rather than extend it:

- **Real-time driver: Pusher, not Reverb.** The original Phase 1 spec chose
  Laravel Reverb specifically to avoid a third-party service dependency.
  The user explicitly overrode that during this feature's brainstorming,
  choosing the hosted Pusher service instead. This document's "Phase 2"
  is Pusher-based; if Reverb is wanted for anything later, that would be a
  separate, explicit decision.
- **Invitations are a first-class pending/accept/decline concept**, not an
  instant-add. This is a real data model and UI flow, not a shortcut on
  top of `join()`.

## Scope

In scope:
- Real-time infrastructure: Pusher broadcasting, a presence channel for
  app-wide online tracking, a private per-user channel for invitation
  push notifications.
- An `invitations` data model and full send/accept/decline flow.
- A new "Invite Players" page, reachable from a game's Lobby (host-only,
  recruiting-only), listing all other registered users with online status
  and per-user invite status.
- A "Pending Invitations" section on the Dashboard where a user
  accepts/declines invites addressed to them, plus a live toast if they're
  online when one arrives.

Out of scope (still deferred to later phases, unchanged from the original
plan): bots, spy assignment, game "launch", accusation voting, scoring,
round progression, i18n, the ~500-location dataset, age-tiered difficulty.
Also explicitly out of scope for *this* feature: real-time propagation of
lobby roster changes (a player joining/leaving isn't pushed live to other
viewers of that lobby yet) — that's still a separate, not-yet-scheduled
piece of "real multiplayer sync"; this feature only wires up presence and
invitation notifications, not full lobby live-sync.

## Real-Time Infrastructure

- **Backend:** `pusher/pusher-php-server` (Laravel's built-in
  `PusherBroadcaster` driver), `BROADCAST_CONNECTION=pusher` in `.env`,
  with `PUSHER_APP_ID`/`PUSHER_APP_KEY`/`PUSHER_APP_SECRET`/`PUSHER_APP_CLUSTER`
  as standard Laravel env vars (a real Pusher account/app is a prerequisite
  the user will need to provide credentials for — this plan cannot create
  that account).
- **Frontend:** `laravel-echo` + `pusher-js`, bootstrapped once in
  `resources/js/echo.ts` and initialized after the authenticated user is
  known (not on the guest login/register pages).
- **Presence channel** `presence-online-users`: every authenticated user
  subscribes to this once, app-wide (in the main authenticated layout,
  not per-page), immediately after the Inertia app mounts for a logged-in
  user. `routes/channels.php` authorizes any authenticated user and
  returns `{ id, codename }` as that member's presence payload. A Vue
  composable (`resources/js/composables/usePresence.ts`) wraps the
  subscription and exposes a reactive `Set<number>` of online user IDs,
  updated via Pusher's `here`/`joining`/`leaving` presence events. This is
  the sole source of truth for "online" — no `last_seen_at` column or
  polling.
- **Private channel** `private-user.{id}`: authorized only for that
  specific user (`routes/channels.php`: `Broadcast::channel('user.{id}',
  fn ($user, $id) => (int) $user->id === (int) $id)`). Used to broadcast
  an `InvitationSent` event carrying the new invitation's summary (game
  title, inviter codename) to the invited user if they're currently
  connected, driving the live toast.

## Data Model

**`invitations`**:
- `id` (bigint, pk)
- `game_id` (FK → `games.id`, cascade on delete)
- `from_user_id` (FK → `users.id`, cascade on delete) — the host who sent it
- `to_user_id` (FK → `users.id`, cascade on delete) — the invited user
- `status` (string, default `pending`) — `pending` | `accepted` | `declined`
- timestamps
- Unique constraint on (`game_id`, `to_user_id`) — one invitation row per
  game+recipient pair, ever. Re-inviting someone who previously declined
  updates that same row back to `pending` (with fresh timestamps) rather
  than inserting a new row.

**Constraints enforced server-side** (mirroring the existing `join()`
pattern from Phase 1):
- Only `games.host_id === auth()->id()` may send invitations for that
  game, and only while `games.status === 'recruiting'`.
- Cannot invite a user already present in that game's `game_players`.
- Cannot send a new invitation (or reactivate a declined one to pending)
  if the game is already at `max_players`.
- On accept: re-checks the full-roster condition (in case it filled up
  between invite and accept) and returns a graceful error if so, mirroring
  `join()`'s existing full-roster error handling; otherwise creates the
  `game_players` row (`is_host: false`, `status: 'ready'`) and marks the
  invitation `accepted`.
- On decline: marks the invitation `declined`, no `game_players` row.

## Routes, Controllers, Pages

| Route | Method | Action | Notes |
|---|---|---|---|
| `/games/{code}/invite` | GET | `InvitationController@index` | Renders `resources/js/pages/games/InviteUsers.vue`. Props: all users except self and current roster members, each with `invite_status: null \| 'pending'` — `null` covers both "never invited" and "previously declined" (a declined row is a free-to-reinvite state, not a blocking one; only an actual `pending` row surfaces as `'pending'`). The current online-user-ID set is derived client-side from the presence composable (not sent server-side, since it's inherently live). Sorted online-first is a client-side concern (re-sorts reactively as presence changes), with `name` (alphabetical) as the fixed secondary sort so the list doesn't jump around unpredictably. Authorization: 403 unless host and game is `recruiting`. |
| `/games/{code}/invitations` | POST | `InvitationController@store` | Body: `{ to_user_id }`. Creates/reactivates the invitation row per the constraints above, dispatches `InvitationSent` (broadcasts on `private-user.{to_user_id}`). Returns to the invite page with updated status. |
| `/invitations/{invitation}/accept` | POST | `InvitationController@accept` | Authorization: only `to_user_id === auth()->id()`. Creates the `game_players` row, marks accepted, redirects to `games.show`. |
| `/invitations/{invitation}/decline` | POST | `InvitationController@decline` | Authorization: only `to_user_id === auth()->id()`. Marks declined, redirects back to dashboard. |

**`Lobby.vue`**: gains an "Invite Players" link to `/games/{code}/invite`,
rendered only when `auth user is host` and `game.status === 'recruiting'`
(client-side convenience; the route itself is still authorized
server-side regardless).

**`Dashboard.vue`**: gains a "Pending Invitations" section — server-loaded
list of the current user's `pending` invitations (game title, inviter
codename, Accept/Decline buttons) — plus a small always-mounted component
that subscribes to the user's private channel for the lifetime of any
authenticated page and shows a toast when `InvitationSent` fires while
they're already looking at something else. The persistent inbox section
itself is not live-updated in place (it reflects what the server sent on
that page load); the toast is the "something changed, you may want to
refresh" signal, matching the "persistent inbox + live toast if online"
decision from brainstorming without needing to build a fully reactive
inbox list for this feature.

## Testing

**Pest** (`tests/Feature/InvitationTest.php` or similar): sending an
invitation creates the row and dispatches the broadcast event (assert via
`Event::fake()`); re-inviting a declined user reactivates the same row
rather than duplicating; a non-host or non-recruiting-game send attempt is
rejected; inviting an already-rostered user is rejected; inviting into a
full game is rejected; accepting creates the `game_players` row and
handles the full-game race at accept-time; declining does not create a
row; only the invitation's actual recipient can accept/decline it (a
third party gets 403).

**Cypress**: covers the parts that don't require a live, two-socket
Pusher connection in CI — host sends an invite from the Invite Players
page, the invited user (as a second registered account) sees it in their
Dashboard's Pending Invitations section on their next page load, accepts
it, and lands in the game's lobby with their roster row present. The
live presence dot (someone shown as "online" in real time) and the live
toast notification are **not** covered by CI E2E — verifying those
requires real Pusher API credentials as CI secrets and two simultaneously
connected browser sessions, a meaningfully larger CI investment than
Phase 1 needed. Per the brainstorming decision, these are left as
manually-verified behavior; this is stated explicitly here rather than
silently under-tested.

## Prerequisite the User Must Provide

A real Pusher account/app (with `PUSHER_APP_ID`/`KEY`/`SECRET`/`CLUSTER`)
is required for this feature to function at all, in every environment
including local development and CI. This plan cannot create that account;
implementation will need these credentials supplied (e.g. as local `.env`
values and, if E2E coverage of anything beyond the non-realtime path is
ever added later, as CI secrets).
