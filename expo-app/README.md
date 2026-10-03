# SpyNet Mobile (Expo)

iOS/Android client for the SpyNet platform. Talks to `../laravel-app`'s
`/api/v1` JSON API (see that README's "Mobile API" section).

## Develop

Requires Node 24 or newer.

```bash
cp .env.example .env         # set EXPO_PUBLIC_API_URL to your machine's LAN IP or a tunnel
npm install
npx expo start               # then open the dev build (push needs a dev build, not Expo Go)
```

Serve the backend so the phone can reach it:
`cd ../laravel-app && php artisan serve --host=0.0.0.0 --port=8000`. iOS
blocks plain-HTTP LAN addresses in some builds; if requests fail, use an
HTTPS tunnel URL instead.

## Test

- `npm test` — typecheck, lint, Jest.
- `maestro test .maestro/01_register_and_create.yaml` — E2E against a dev build.

## Structure

- `app/` — Expo Router screens. `(auth)` is for signed-out users, `(app)` for
  signed-in users; each group's layout redirects the other way.
- `src/api` — fetch client, typed errors, endpoints, TanStack Query hooks.
- `src/auth` — token session (secure store) and `AuthProvider`.
- `src/realtime` — Laravel Echo over Pusher: presence, invitation banners,
  live lobbies.
- `src/notifications` — Expo push registration and tap handling.
- `src/components`, `src/theme` — UI kit built on the web app's color tokens.

Releasing: see `RELEASE.md`.
