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

_

Your side (needs your accounts or servers):

Production deploy: run the migration, start the scheduler and queue worker, configure mail and set APP_NAME, as listed before.
Change the Neon database password. The old host was public in the README, and git history still has it.
Pick a real bundle id (for example com.yourname.spynet), set APP_BUNDLE_ID, and do a first EAS build. Push notifications only work in a real build, not the simulator, so test them on a phone.
Worth doing next (I can do these):
4. Android check. Only iOS has been run with Maestro. Running the flows on an Android emulator would test the push channel fix and the keyboard behaviour there.
5. Flow 02 (join and invite) needs two accounts. I can make it create its own second user through the API so it runs on its own, then add the Maestro flows to CI.
6. Delete the merged branches (lobby-improvements, open-games, notifications, phrase-game, spy-rounds-and-ukrainian, ukrainian-gaps, polish) locally and on GitHub. They're all merged into main.
7. Error monitoring (Sentry or similar) for both apps, so production crashes reach you.

Bigger product ideas, if you want them:
8. A third game for the "Coming Soon" tile.
9. Play stats per player (games played, wins as spy, phrases guessed).
10. Rematch with the same players in one tap after a game ends.

I'd start with 4–6. Tell me which ones to do.