# Releasing Marvelous Games Mobile

## One-time setup

1. Install the CLI and log in: `npm install -g eas-cli && eas login`.
2. Link the project: `eas init`. The project id lives in `app.config.ts`
   (`extra.eas.projectId`); push tokens need it.
3. Choose your store identifier (e.g. `com.yourname.marvelousgames`) and set it as
   `APP_BUNDLE_ID` for every EAS environment
   (`eas env:create --environment production --name APP_BUNDLE_ID --value com.yourname.marvelousgames`).
   Without it, `app.config.ts` falls back to the `com.poedgar.marvelousgames`
   placeholder, which only works for local development. Update `appId` in
   `.maestro/*.yaml` to match. (The icons, adaptive icon and splash in
   `assets/` are the mask mark; swap them if you have final artwork.)
4. Environment variables per EAS environment (`development`, `preview`,
   `production`):

   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<your-laravel-cloud-domain>
   eas env:create --environment production --name EXPO_PUBLIC_PUSHER_KEY --value <pusher key>
   eas env:create --environment production --name EXPO_PUBLIC_PUSHER_CLUSTER --value <pusher cluster>
   ```

5. Push credentials:
   - **iOS:** `eas credentials` → let EAS generate the APNs key with your Apple
     Developer account.
   - **Android:** create a Firebase project, download `google-services.json`,
     upload it as a file env var named `GOOGLE_SERVICES_JSON`
     (`eas env:create --type file --name GOOGLE_SERVICES_JSON --value ./google-services.json`),
     and upload the FCM V1 service-account key with `eas credentials`.
6. Backend (Laravel Cloud): managed database, queue worker enabled, mail
   configured, Pusher variables set, and `EXPO_ACCESS_TOKEN` if you enable
   enhanced push security in your Expo account.

## Builds

| Purpose | Command |
|---|---|
| Dev client for simulators/devices | `eas build --profile development --platform all` |
| Internal testers | `eas build --profile preview --platform all` |
| Store | `eas build --profile production --platform all` |
| Submit | `eas submit --profile production --platform ios` / `--platform android` |

## Pre-submission checklist

- [ ] `npm test` passes.
- [ ] Maestro flows 01 and 02 pass against the staging backend.
- [ ] On a physical iPhone and Android phone: invitation push arrives with the
      app in the background, and tapping it opens Spy with the invitation
      highlighted.
- [ ] With the app open, a new invitation shows the in-app banner (no OS banner).
- [ ] Two devices: online dots on Invite Players update as the other device
      opens/backgrounds the app; the lobby roster updates live when the second
      device joins.
- [ ] Sharing an invite from the lobby and opening `marvelousgames://join/<code>` on
      another device pre-fills Join Operation.
- [ ] Log in with a 2FA-enabled account (code and recovery code).
- [ ] Voice chat (needs LiveKit set up on the server): two phones join the
      same lobby's voice, hear each other, mute shows on the other phone,
      and leaving the lobby ends the call. The microphone prompt appears on
      first join.
- [ ] Delete account works and the account can no longer log in (web or app).
- [ ] Store listings: privacy policy URL, screenshots, description, and the
      App Store "account deletion" answer pointing at Settings → Delete account.
