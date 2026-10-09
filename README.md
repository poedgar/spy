# Marvelous Games

Party games for friends, on the web and on phones: **Spy** (everyone knows
the location except the spies) and **Phrase** (everyone holds one word of a
famous phrase). English and Ukrainian.

| Folder         | What it is                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `laravel-app/` | The main app: Laravel + Inertia/Vue web client, and the JSON API for mobile. |
| `expo-app/`    | The iOS/Android app (Expo, React Native), built on the Laravel API.          |
| repo root      | The original React/Firebase prototype, kept as it was.                     |

Details live in each app's README: [`laravel-app/README.md`](laravel-app/README.md)
(game rules, API, realtime, notifications) and
[`expo-app/README.md`](expo-app/README.md) / [`expo-app/RELEASE.md`](expo-app/RELEASE.md).

## Running locally

```bash
# Web app + API
cd laravel-app
composer setup        # install, .env, key, migrate, build
composer dev          # server, queue worker, Vite

# Mobile app (needs the API running)
cd expo-app
npm install
npx expo start
```

## Deploying the Laravel app

Every deploy:

1. `php artisan migrate --force` — the app fails with "relation does not
   exist" errors if this is skipped.
2. Build the front end **after** setting the `VITE_PUSHER_*` variables (they
   are baked in at build time).

Once, on the server:

- **Queue worker** (`php artisan queue:work`): live notifications, pushes and
  emails are queued. The in-app bell works without it.
- **Scheduler** (`php artisan schedule:work`, or cron running
  `php artisan schedule:run` every minute): prunes old notifications, stale
  games and expired mobile sign-ins daily.
- **Realtime:** Pusher credentials (`PUSHER_APP_*`), or a self-hosted
  Pusher-compatible server via `PUSHER_HOST/PORT/SCHEME`. Without it the apps
  still work, refreshing every few seconds instead of instantly.
- **Mail** (`MAIL_*`): invitation emails, password resets, email
  verification.
- `APP_NAME="Marvelous Games"`, and `SANCTUM_TOKEN_EXPIRATION` if mobile sign-ins
  should last other than 90 days.

## CI

GitHub Actions run per app on changes to it: Laravel tests, PHPStan and Pint
(`laravel-app-tests.yml`), the Laravel Cypress suite
(`laravel-app-cypress.yml`), the mobile typecheck, lint, Jest and Expo doctor
(`expo-app.yml`), and the prototype's Cypress suite (`cypress.yml`).

## Former TODO list

All done: Ukrainian, notifications, invited players showing up without a
reload, a minimum (3) as the default table size, asking to join, and
joining without an invitation (open games and join requests).
