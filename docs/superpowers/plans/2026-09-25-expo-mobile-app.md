# Expo Mobile App (Plan B of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `expo-app/`, a store-ready iOS/Android client for SpyNet that reaches feature parity with the web app (auth incl. 2FA, game picker, Spy home, create/join, live lobby, invite players with presence, invitations, account settings) plus push notifications and `spynet://join/{code}` deep links.

**Architecture:** Expo Router screens under `app/` are thin; all logic lives in `src/`: a `fetch` API client with typed errors, TanStack Query hooks, an `AuthProvider` holding the Sanctum token in `expo-secure-store`, a `RealtimeProvider` wrapping Laravel Echo + pusher-js, and a notifications module. Group layouts `(auth)` and `(app)` gate navigation on auth state and remember a deep link opened while signed out.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Expo Router, TanStack Query 5, react-hook-form, expo-secure-store, laravel-echo 2 + pusher-js 8 (React Native build), expo-notifications, Jest (`jest-expo`) + React Native Testing Library + `expo-router/testing-library`, Maestro, EAS Build/Submit.

**Spec:** `docs/superpowers/specs/2026-09-25-expo-mobile-app-design.md` (Part 2 — Mobile App, Testing, Release). **Depends on Plan A** (`docs/superpowers/plans/2026-09-25-mobile-api-backend.md`) being complete: every endpoint, payload and channel used here is defined there.

## Global Constraints

- The app lives in `expo-app/` at the repo root (sibling of `laravel-app/`); it must not have its own `.git`.
- Node comes from nvm and is not on the default PATH: prefix every shell session with `export PATH=~/.nvm/versions/node/v24.13.0/bin:$PATH`. All commands run from `expo-app/` unless stated.
- Install Expo-managed native packages with `npx expo install` (it pins SDK-57-compatible versions); plain JS libraries with `npm install`.
- API base: `${EXPO_PUBLIC_API_URL}/api/v1`; broadcast auth: `${EXPO_PUBLIC_API_URL}/api/broadcasting/auth`.
- Config comes only from `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PUSHER_KEY`, `EXPO_PUBLIC_PUSHER_CLUSTER`, `EAS_PROJECT_ID` — read in exactly one module, `src/config.ts`.
- Token storage: `expo-secure-store` only, key `spynet.session`.
- Deep link scheme `spynet`; `spynet://join/{code}` never auto-joins — it pre-fills the join screen and asks for confirmation.
- Invite codes match `^SPY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$`.
- Wording mirrors the web: "Choose a Game", "Spy", "Coming Soon", "Your Operations", "Pending Invitations", "Create Operation", "Join Operation", "Roster", "Invite Players", "operatives".
- Colors: the web's shadcn tokens from `laravel-app/resources/css/app.css`, light and dark, chosen by the system color scheme. No UI kit.
- Bundle id / package placeholder: `com.example.spynet`.
- Never show raw 5xx text; the client replaces it with "Something went wrong. Please try again."
- `npm test` runs `tsc --noEmit`, `expo lint` and Jest; it must pass at the end of every task.
- Commit messages follow the repo's plain-sentence style and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Invite code typed in lowercase or with spaces on the join screen** — the app trims and uppercases before calling the API (the server is case-sensitive). Pinned in Task 6.
- **A 401 on any request while signed in (token revoked on another device)** — the app signs out locally and lands on Welcome, not an error screen. Pinned in Task 2 (client) and Task 3 (provider).
- **App launched offline with a saved session** — the user stays signed in from the stored session instead of being bounced to Welcome. Pinned in Task 3.
- **A `spynet://join/…` link opened while signed out** — after logging in, the user lands on that join confirmation, not on the game picker. Pinned in Task 3.
- **Opening a lobby you're not on (403)** — shows "You're not on this operation" with a Join button, not a generic error. Pinned in Task 7.

---

### Task 1: Scaffold `expo-app/` with Expo Router, config, theme, and the test toolchain

**Files:**
- Create (via CLI): `expo-app/` from the `blank-typescript` template
- Delete: `expo-app/App.tsx`, `expo-app/index.ts`
- Create: `expo-app/app.config.ts` (replaces `app.json`), `expo-app/eas.json`, `expo-app/.env.example`, `expo-app/jest.setup.ts`
- Modify: `expo-app/package.json` (`main`, scripts, jest config), `expo-app/tsconfig.json` (paths), `expo-app/.gitignore`
- Create: `expo-app/src/config.ts`, `expo-app/src/theme/tokens.ts`, `expo-app/src/theme/useTheme.ts`
- Create: `expo-app/app/_layout.tsx` (temporary minimal version, completed in Task 3), `expo-app/app/index.tsx` (temporary, removed in Task 5)
- Test: `expo-app/tests/theme.test.ts`

**Interfaces:**
- Produces:
  - `src/config.ts`: `API_URL: string`, `PUSHER_KEY: string`, `PUSHER_CLUSTER: string`, `EAS_PROJECT_ID: string | undefined`
  - `src/theme/tokens.ts`: `type ColorTokens`, `lightColors`, `darkColors`, `spacing`, `radius`, `fontSize`
  - `src/theme/useTheme.ts`: `useTheme(): { colors: ColorTokens; spacing; radius; fontSize; scheme: 'light' | 'dark' }`
  - Jest alias `@/` → `src/`; global mocks for `@/config` and `expo-secure-store` in `jest.setup.ts`

- [ ] **Step 1: Scaffold**

From the repo root:

```bash
export PATH=~/.nvm/versions/node/v24.13.0/bin:$PATH
npx create-expo-app@latest expo-app --template blank-typescript
cd expo-app
test ! -d .git && echo "no nested git: ok"
```

Expected: `expo-app/package.json` depends on `expo@~57`; `no nested git: ok` prints (if a `.git` exists, delete it with `rm -rf .git`).

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-secure-store expo-notifications expo-device expo-dev-client @react-native-community/netinfo
npm install @tanstack/react-query react-hook-form laravel-echo@^2 pusher-js@^8
npx expo install jest-expo jest @types/jest @testing-library/react-native -- --save-dev
rm App.tsx index.ts app.json
```

- [ ] **Step 3: Configure `package.json`, `tsconfig.json`, `.gitignore`**

In `package.json` set `"main": "expo-router/entry"`, and replace `"scripts"` and add `"jest"`:

```json
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test:unit": "jest",
    "test": "tsc --noEmit && expo lint && jest"
  },
  "jest": {
    "preset": "jest-expo",
    "clearMocks": true,
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
    "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" },
    "testMatch": ["<rootDir>/tests/**/*.test.ts?(x)"]
  }
```

Replace `tsconfig.json` with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

Append to `.gitignore`:

```
.env
```

- [ ] **Step 4: App config and EAS profiles**

`app.config.ts`:

```ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SpyNet',
  slug: 'spynet',
  scheme: 'spynet',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  // Template artwork — replace icon/splash with real artwork before submitting.
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.example.spynet',
    supportsTablet: false,
  },
  android: {
    package: 'com.example.spynet',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#171717',
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { defaultChannel: 'invitations' }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#0a0a0a' },
      },
    ],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
```

(If the template's asset filenames differ, point these paths at the files that exist in `assets/`. Run `npx expo install expo-splash-screen` if `npx expo config` reports the plugin missing.)

`eas.json`:

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview"
    },
    "production": {
      "autoIncrement": true,
      "environment": "production"
    }
  },
  "submit": { "production": {} }
}
```

`.env.example`:

```
# Local development: your machine's LAN IP or a tunnel URL serving laravel-app
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
EXPO_PUBLIC_PUSHER_KEY=
EXPO_PUBLIC_PUSHER_CLUSTER=mt1
# Set by `eas init`; needed for push tokens
EAS_PROJECT_ID=
```

- [ ] **Step 5: Write the failing theme test**

`tests/theme.test.ts`:

```ts
import { darkColors, lightColors } from '@/theme/tokens';

test('light and dark palettes define the same tokens', () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
});

test('palettes are copied from the web theme', () => {
  expect(lightColors.primary).toBe('hsl(0, 0%, 9%)');
  expect(darkColors.background).toBe('hsl(0, 0%, 3.9%)');
  expect(lightColors.destructive).toBe('hsl(0, 84.2%, 60.2%)');
});
```

`jest.setup.ts`:

```ts
import '@testing-library/react-native/extend-expect';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

jest.mock('@/config', () => ({
  API_URL: 'https://api.test',
  PUSHER_KEY: 'test-key',
  PUSHER_CLUSTER: 'mt1',
  EAS_PROJECT_ID: 'test-project',
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

beforeEach(() => {
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store.clear();
});
```

Run: `npx jest tests/theme.test.ts`
Expected: FAIL — `Cannot find module '@/theme/tokens'`.

- [ ] **Step 6: Write config and theme**

`src/config.ts`:

```ts
import Constants from 'expo-constants';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_KEY ?? '';
export const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_CLUSTER ?? 'mt1';
export const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
```

`src/theme/tokens.ts` (values from `laravel-app/resources/css/app.css`, with commas because React Native's `hsl()` parser requires them):

```ts
export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  online: string;
}

export const lightColors: ColorTokens = {
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(0, 0%, 3.9%)',
  card: 'hsl(0, 0%, 100%)',
  cardForeground: 'hsl(0, 0%, 3.9%)',
  primary: 'hsl(0, 0%, 9%)',
  primaryForeground: 'hsl(0, 0%, 98%)',
  secondary: 'hsl(0, 0%, 92.1%)',
  secondaryForeground: 'hsl(0, 0%, 9%)',
  muted: 'hsl(0, 0%, 96.1%)',
  mutedForeground: 'hsl(0, 0%, 45.1%)',
  accent: 'hsl(0, 0%, 96.1%)',
  accentForeground: 'hsl(0, 0%, 9%)',
  destructive: 'hsl(0, 84.2%, 60.2%)',
  destructiveForeground: 'hsl(0, 0%, 98%)',
  border: 'hsl(0, 0%, 92.8%)',
  input: 'hsl(0, 0%, 89.8%)',
  ring: 'hsl(0, 0%, 3.9%)',
  online: 'hsl(142, 71%, 45%)',
};

export const darkColors: ColorTokens = {
  background: 'hsl(0, 0%, 3.9%)',
  foreground: 'hsl(0, 0%, 98%)',
  card: 'hsl(0, 0%, 3.9%)',
  cardForeground: 'hsl(0, 0%, 98%)',
  primary: 'hsl(0, 0%, 98%)',
  primaryForeground: 'hsl(0, 0%, 9%)',
  secondary: 'hsl(0, 0%, 14.9%)',
  secondaryForeground: 'hsl(0, 0%, 98%)',
  muted: 'hsl(0, 0%, 16.08%)',
  mutedForeground: 'hsl(0, 0%, 63.9%)',
  accent: 'hsl(0, 0%, 14.9%)',
  accentForeground: 'hsl(0, 0%, 98%)',
  destructive: 'hsl(0, 84%, 60%)',
  destructiveForeground: 'hsl(0, 0%, 98%)',
  border: 'hsl(0, 0%, 14.9%)',
  input: 'hsl(0, 0%, 14.9%)',
  ring: 'hsl(0, 0%, 83.1%)',
  online: 'hsl(142, 69%, 58%)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 8, lg: 12 } as const;
export const fontSize = { sm: 13, md: 15, lg: 18, xl: 22, mono: 15 } as const;
```

`src/theme/useTheme.ts`:

```ts
import { useColorScheme } from 'react-native';
import { darkColors, fontSize, lightColors, radius, spacing } from './tokens';

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    fontSize,
  } as const;
}
```

- [ ] **Step 7: Temporary layout and screen so the app boots**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

`app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>SpyNet</Text>
    </View>
  );
}
```

- [ ] **Step 8: Set up lint and run everything**

Run: `npx expo lint` (answer yes to installing `eslint-config-expo`; it creates `eslint.config.js`), then `npm test`.
Expected: typecheck clean, lint clean, 2 Jest tests pass. Also `npx expo config --type public` prints `scheme: 'spynet'` without errors.

- [ ] **Step 9: Commit**

```bash
cd .. && git add expo-app && git commit -m "Scaffold the Expo app with Expo Router, theme tokens and the test toolchain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: API client, typed errors, types, endpoints and query hooks

**Files:**
- Create: `src/api/errors.ts`, `src/api/client.ts`, `src/api/types.ts`, `src/api/endpoints.ts`, `src/api/queryClient.ts`, `src/api/queries.ts`
- Test: `tests/api/client.test.ts`

**Interfaces:**
- Consumes: `API_URL` (Task 1).
- Produces:
  - `ApiError(status: number, message: string)`, `ValidationError(message, fieldErrors: Record<string, string[]>)` (status 422), `NetworkError()`
  - `configureClient({ getToken: () => string | null; onUnauthorized: () => void }): void`
  - `request<T>(method, path, body?): Promise<T>`
  - Types: `User`, `Player`, `GameMode`, `Game`, `Invitation`, `InvitableUser`, `SpyHome`, `AuthResult`, `TokenResult`, `CreateGameInput`, `RegisterInput`, `PlayerJoinedPayload`, `InvitationSentPayload`
  - `authApi.{register, login, twoFactor, forgotPassword, logout}`, `meApi.{get, update, updatePassword, destroy, registerPushToken}`, `gamesApi.{spyHome, create, show, join, invitableUsers, invite, accept, decline}`
  - `createQueryClient(): QueryClient`, `bindQueryClientToAppState(): () => void`
  - `queryKeys`, `useSpyHome()`, `useGame(code)`, `useInvitableUsers(code)`, `useCreateGame()`, `useJoinGame()`, `useAcceptInvitation()`, `useDeclineInvitation()`, `useInvite(code)`, `useRefreshOnFocus(refetch)`

- [ ] **Step 1: Write the failing test**

`tests/api/client.test.ts`:

```ts
import { configureClient, request } from '@/api/client';
import { ApiError, NetworkError, ValidationError } from '@/api/errors';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

let token: string | null = null;
const onUnauthorized = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  onUnauthorized.mockReset();
  token = 'abc';
  configureClient({ getToken: () => token, onUnauthorized });
});

test('sends JSON with the bearer token to the versioned API', async () => {
  respond(200, { id: 1 });

  await expect(request('POST', '/games', { title: 'X' })).resolves.toEqual({ id: 1 });

  expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/games', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer abc' },
    body: '{"title":"X"}',
  });
});

test('omits the Authorization header when signed out', async () => {
  token = null;
  respond(200, {});

  await request('GET', '/me');

  expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});

test('returns undefined for 204', async () => {
  respond(204);

  await expect(request('POST', '/auth/logout')).resolves.toBeUndefined();
});

test('maps 422 to a ValidationError with field errors', async () => {
  respond(422, { message: 'Bad', errors: { code: ['This operation roster is already full.'] } });

  const error = await request('POST', '/games/SPY-AAAA/join').catch((e) => e);

  expect(error).toBeInstanceOf(ValidationError);
  expect(error.fieldErrors).toEqual({ code: ['This operation roster is already full.'] });
});

test('a 401 with a token triggers onUnauthorized', async () => {
  respond(401, { message: 'Unauthenticated.' });

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(ApiError);
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test('a 401 without a token does not trigger onUnauthorized', async () => {
  token = null;
  respond(401, { message: 'Unauthenticated.' });

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(ApiError);
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('5xx never exposes server text', async () => {
  respond(500, { message: 'SQLSTATE[HY000] secret' });

  await expect(request('GET', '/games/spy')).rejects.toMatchObject({
    status: 500,
    message: 'Something went wrong. Please try again.',
  });
});

test('network failure becomes a NetworkError', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

  await expect(request('GET', '/me')).rejects.toBeInstanceOf(NetworkError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/api/client.test.ts`
Expected: FAIL — `Cannot find module '@/api/client'`.

- [ ] **Step 3: Write errors and client**

`src/api/errors.ts`:

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]>,
  ) {
    super(422, message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Can't reach SpyNet. Check your connection.");
    this.name = 'NetworkError';
  }
}
```

`src/api/client.ts`:

```ts
import { API_URL } from '@/config';
import { ApiError, NetworkError, ValidationError } from './errors';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureClient(options: { getToken: () => string | null; onUnauthorized: () => void }): void {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (response.ok) return data as T;

  if (response.status === 401) {
    // Only a request that carried a token means "your session ended".
    if (token) onUnauthorized();
    throw new ApiError(401, data?.message ?? 'Unauthenticated.');
  }

  if (response.status === 422) {
    throw new ValidationError(data?.message ?? 'Please check the form.', data?.errors ?? {});
  }

  const message =
    response.status >= 500 ? 'Something went wrong. Please try again.' : (data?.message ?? 'Request failed.');
  throw new ApiError(response.status, message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/api/client.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Write types, endpoints, the query client and hooks**

`src/api/types.ts` (mirrors Plan A's API Resources):

```ts
export interface User {
  id: number;
  name: string;
  codename: string;
  email?: string;
}

export interface Player {
  id: number;
  user: User;
  is_host: boolean;
  status: string;
  joined_at: string | null;
}

export type GameMode = 'mole' | 'codebreaker' | 'counterintel';

export interface Game {
  id: number;
  code: string;
  title: string;
  game_type: string;
  game_mode: GameMode;
  max_players: number;
  mission_briefing: string;
  status: 'recruiting' | 'active' | 'voting' | 'completed';
  host_id: number;
  player_count: number;
  created_at: string | null;
  host?: User;
  players?: Player[];
}

export interface Invitation {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  game_title: string;
  game_code: string;
  from_codename: string;
  created_at: string | null;
}

export interface InvitableUser {
  id: number;
  name: string;
  codename: string;
  invite_status: 'pending' | null;
}

export interface SpyHome {
  games: Game[];
  pending_invitations: Invitation[];
}

export interface TokenResult {
  token: string;
  user: User;
}

export type AuthResult = TokenResult | { two_factor: true; challenge: string };

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CreateGameInput {
  title: string;
  game_mode: GameMode;
  max_players: number;
  mission_briefing: string;
}

export interface PlayerJoinedPayload {
  player: Player;
  player_count: number;
}

export interface InvitationSentPayload {
  invitation_id: number;
  game_title: string;
  game_code: string;
  from_codename: string;
}
```

`src/api/endpoints.ts`:

```ts
import { request } from './client';
import type {
  AuthResult,
  CreateGameInput,
  Game,
  InvitableUser,
  Invitation,
  RegisterInput,
  SpyHome,
  TokenResult,
  User,
} from './types';

const enc = encodeURIComponent;

export const authApi = {
  register: (input: RegisterInput & { device_name: string }) => request<TokenResult>('POST', '/auth/register', input),
  login: (input: { email: string; password: string; device_name: string }) =>
    request<AuthResult>('POST', '/auth/login', input),
  twoFactor: (input: { challenge: string; code?: string; recovery_code?: string }) =>
    request<TokenResult>('POST', '/auth/two-factor', input),
  forgotPassword: (email: string) => request<{ message: string }>('POST', '/auth/forgot-password', { email }),
  logout: () => request<void>('POST', '/auth/logout'),
};

export const meApi = {
  get: () => request<User>('GET', '/me'),
  update: (input: { name: string; email: string }) => request<User>('PATCH', '/me', input),
  updatePassword: (input: { current_password: string; password: string; password_confirmation: string }) =>
    request<void>('PUT', '/me/password', input),
  destroy: (password: string) => request<void>('DELETE', '/me', { password }),
  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    request<void>('POST', '/me/push-tokens', { token, platform }),
};

export const gamesApi = {
  spyHome: () => request<SpyHome>('GET', '/games/spy'),
  create: (input: CreateGameInput) => request<Game>('POST', '/games', input),
  show: (code: string) => request<Game>('GET', `/games/${enc(code)}`),
  join: (code: string) => request<Game>('POST', `/games/${enc(code)}/join`),
  invitableUsers: (code: string) => request<InvitableUser[]>('GET', `/games/${enc(code)}/invitable-users`),
  invite: (code: string, toUserId: number) =>
    request<Invitation>('POST', `/games/${enc(code)}/invitations`, { to_user_id: toUserId }),
  accept: (invitationId: number) => request<Game>('POST', `/invitations/${invitationId}/accept`),
  decline: (invitationId: number) => request<void>('POST', `/invitations/${invitationId}/decline`),
};
```

`src/api/queryClient.ts`:

```ts
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { NetworkError } from './errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Retry twice on network errors only; 4xx answers are final.
      queries: { retry: (count, error) => error instanceof NetworkError && count < 2, staleTime: 10_000 },
      mutations: { retry: false },
    },
  });
}

/** Refetch stale queries when the app returns to the foreground or regains network. */
export function bindQueryClientToAppState(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );

  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });

  return () => subscription.remove();
}
```

`src/api/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { gamesApi } from './endpoints';
import type { Game } from './types';

export const queryKeys = {
  spyHome: ['spyHome'] as const,
  game: (code: string) => ['game', code] as const,
  invitable: (code: string) => ['invitable', code] as const,
};

export function useSpyHome() {
  return useQuery({ queryKey: queryKeys.spyHome, queryFn: gamesApi.spyHome });
}

export function useGame(code: string) {
  return useQuery({ queryKey: queryKeys.game(code), queryFn: () => gamesApi.show(code) });
}

export function useInvitableUsers(code: string) {
  return useQuery({ queryKey: queryKeys.invitable(code), queryFn: () => gamesApi.invitableUsers(code) });
}

function useCacheLobby() {
  const queryClient = useQueryClient();
  return (game: Game) => {
    queryClient.setQueryData(queryKeys.game(game.code), game);
    void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
  };
}

export function useCreateGame() {
  return useMutation({ mutationFn: gamesApi.create, onSuccess: useCacheLobby() });
}

export function useJoinGame() {
  return useMutation({ mutationFn: gamesApi.join, onSuccess: useCacheLobby() });
}

export function useAcceptInvitation() {
  return useMutation({ mutationFn: gamesApi.accept, onSuccess: useCacheLobby() });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gamesApi.decline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.spyHome }),
  });
}

export function useInvite(code: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toUserId: number) => gamesApi.invite(code, toUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitable(code) }),
  });
}

/** Refetch when a screen regains focus (skipping the initial focus, which already fetched). */
export function useRefreshOnFocus(refetch: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}
```

- [ ] **Step 6: Run the full check**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add the API client, typed errors, endpoints and query hooks to the Expo app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `AuthProvider`, the root layout, the auth gate, and the deep-link resume

**Files:**
- Create: `src/auth/session.ts`, `src/auth/AuthProvider.tsx`
- Create: `src/linking.ts`
- Replace: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`, `app/(app)/_layout.tsx`, `app/(app)/join/[code].tsx`
- Move: `app/index.tsx` → `app/(app)/index.tsx` (still the placeholder; Task 5 replaces it)
- Create: `tests/support/renderApp.tsx`, `tests/support/fakes.ts`
- Test: `tests/auth/AuthProvider.test.tsx`, `tests/auth/gate.test.tsx`, `tests/linking.test.ts`

**Interfaces:**
- Consumes: `authApi`, `meApi`, `configureClient`, `createQueryClient`, `bindQueryClientToAppState` (Task 2).
- Produces:
  - `useAuth(): { state: AuthState; login(email, password): Promise<{ challenge: string } | null>; completeTwoFactor(challenge, { code?; recovery_code? }): Promise<void>; register(input: RegisterInput): Promise<void>; logout(): Promise<void>; signOutLocally(): Promise<void>; setUser(user: User): void; pendingHref: string | null; setPendingHref(href: string | null): void }`
  - `type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; token: string; user: User }`
  - `src/linking.ts`: `INVITE_CODE_PATTERN`, `normalizeInviteCode(raw: string): string`, `isInviteCode(value: string): boolean`, `invitationHrefFrom(data: unknown): { pathname: '/spy'; params: { highlight: string } } | null`
  - Test helpers `renderApp(routes, { initialUrl, user? })` and `fakeUser`

- [ ] **Step 1: Write the failing tests**

`tests/linking.test.ts`:

```ts
import { invitationHrefFrom, isInviteCode, normalizeInviteCode } from '@/linking';

test('normalizes typed codes', () => {
  expect(normalizeInviteCode('  spy-ab3d ')).toBe('SPY-AB3D');
});

test('validates the server code charset', () => {
  expect(isInviteCode('SPY-AB3D')).toBe(true);
  expect(isInviteCode('SPY-AB1D')).toBe(false); // 1 is excluded
  expect(isInviteCode('SPY-ABCDE')).toBe(false);
  expect(isInviteCode('spy-ab3d')).toBe(false);
});

test('maps an invitation push payload to the spy home with a highlight', () => {
  expect(invitationHrefFrom({ type: 'invitation', invitation_id: 7, code: 'SPY-AB3D' })).toEqual({
    pathname: '/spy',
    params: { highlight: '7' },
  });
  expect(invitationHrefFrom({ type: 'other' })).toBeNull();
  expect(invitationHrefFrom(undefined)).toBeNull();
});
```

`tests/support/fakes.ts`:

```ts
import type { Game, User } from '@/api/types';

export const fakeUser: User = { id: 1, name: 'Ada', codename: 'SHADOW_FOX', email: 'ada@example.com' };
export const otherUser: User = { id: 2, name: 'Bob', codename: 'NIGHT_HAWK' };

export function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 10,
    code: 'SPY-AB3D',
    title: 'Operation Nightfall',
    game_type: 'spy',
    game_mode: 'mole',
    max_players: 6,
    mission_briefing: 'Find the mole.',
    status: 'recruiting',
    host_id: fakeUser.id,
    player_count: 1,
    created_at: null,
    host: fakeUser,
    players: [{ id: 100, user: fakeUser, is_host: true, status: 'ready', joined_at: null }],
    ...overrides,
  };
}
```

`tests/support/renderApp.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { renderRouter } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import type { ComponentType, ReactNode } from 'react';
import { meApi } from '@/api/endpoints';
import { createQueryClient } from '@/api/queryClient';
import type { User } from '@/api/types';
import { AuthProvider } from '@/auth/AuthProvider';
import { SESSION_KEY } from '@/auth/session';

type Routes = Record<string, ComponentType>;

/**
 * Renders the given route files inside the real providers. With `user`, a
 * stored session is seeded first so the app starts signed in. Screens that
 * need the banner/realtime providers get them from their tasks' versions of
 * this wrapper (Tasks 4 and 7 extend `Providers`).
 */
export async function renderApp(routes: Routes, options: { initialUrl: string; user?: User }) {
  if (options.user) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: 'test-token', user: options.user }));
    jest.mocked(meApi.get).mockResolvedValue(options.user);
  }

  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  }

  const result = renderRouter(routes, { initialUrl: options.initialUrl, wrapper: Providers });
  return { ...result, queryClient };
}
```

`tests/auth/AuthProvider.test.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { request } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { ApiError, NetworkError } from '@/api/errors';
import { createQueryClient } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { SESSION_KEY } from '@/auth/session';
import { fakeUser } from '../support/fakes';

jest.mock('@/api/endpoints');

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

async function seedSession() {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: 'saved', user: fakeUser }));
}

test('starts signed out with no stored session', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
});

test('restores a stored session and refreshes the user', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue({ ...fakeUser, name: 'Ada Updated' });

  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state).toMatchObject({ status: 'signedIn', user: { name: 'Ada Updated' } }));
});

test('stays signed in from the stored session when offline at launch', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockRejectedValue(new NetworkError());

  const { result } = renderHook(() => useAuth(), { wrapper });

  await waitFor(() => expect(result.current.state).toMatchObject({ status: 'signedIn', token: 'saved' }));
});

test('login without 2FA signs in and stores the session', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 'new', user: fakeUser });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.login('ada@example.com', 'password');
  });

  expect(outcome).toBeNull();
  expect(result.current.state).toMatchObject({ status: 'signedIn', token: 'new' });
  expect(JSON.parse((await SecureStore.getItemAsync(SESSION_KEY))!)).toMatchObject({ token: 'new' });
});

test('login for a 2FA user returns the challenge and stays signed out', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ two_factor: true, challenge: 'c'.repeat(40) });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));

  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.login('ada@example.com', 'password');
  });

  expect(outcome).toEqual({ challenge: 'c'.repeat(40) });
  expect(result.current.state.status).toBe('signedOut');
});

test('logout calls the API, clears storage and signs out even if the API call fails', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue(fakeUser);
  jest.mocked(authApi.logout).mockRejectedValue(new ApiError(500, 'x'));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

  await act(() => result.current.logout());

  expect(authApi.logout).toHaveBeenCalled();
  expect(result.current.state.status).toBe('signedOut');
  expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
});

test('a 401 from any request signs the user out', async () => {
  await seedSession();
  jest.mocked(meApi.get).mockResolvedValue(fakeUser);
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.state.status).toBe('signedIn'));

  global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) }) as unknown as typeof fetch;
  await act(async () => {
    await request('GET', '/games/spy').catch(() => undefined);
  });

  await waitFor(() => expect(result.current.state.status).toBe('signedOut'));
});
```

`tests/auth/gate.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthProvider';
import AppLayout from '../../app/(app)/_layout';
import JoinLink from '../../app/(app)/join/[code]';
import AuthLayout from '../../app/(auth)/_layout';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

function FakeLogin() {
  const { login } = useAuth();
  return (
    <Pressable testID="do-login" onPress={() => void login('a@b.c', 'pw')}>
      <Text>welcome</Text>
    </Pressable>
  );
}

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': FakeLogin,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
  '(app)/join/[code]': JoinLink,
  '(app)/spy/join': () => <Text>join screen</Text>,
};

test('signed-out users are sent to welcome', async () => {
  await renderApp(routes, { initialUrl: '/' });

  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('signed-in users skip the auth screens', async () => {
  await renderApp(routes, { initialUrl: '/welcome', user: fakeUser });

  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('a join link opened while signed out resumes after login', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/join/SPY-AB3D' });
  await waitFor(() => expect(screen).toHavePathname('/welcome'));

  await act(async () => {
    fireEvent.press(screen.getByTestId('do-login'));
  });

  await waitFor(() => expect(screen).toHavePathname('/spy/join'));
  expect(screen).toHaveSearchParams({ code: 'SPY-AB3D' });
});

test('an invalid join link falls back to the empty join screen', async () => {
  await renderApp(routes, { initialUrl: '/join/not-a-code', user: fakeUser });

  await waitFor(() => expect(screen).toHavePathname('/spy/join'));
  expect(screen).toHaveSearchParams({});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/linking.test.ts tests/auth`
Expected: FAIL — modules `@/linking`, `@/auth/AuthProvider` not found.

- [ ] **Step 3: Write `linking.ts` and the session store**

`src/linking.ts`:

```ts
export const INVITE_CODE_PATTERN = /^SPY-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value);
}

export function invitationHrefFrom(data: unknown): { pathname: '/spy'; params: { highlight: string } } | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, invitation_id: invitationId } = data as { type?: unknown; invitation_id?: unknown };
  if (type !== 'invitation' || typeof invitationId !== 'number') return null;
  return { pathname: '/spy', params: { highlight: String(invitationId) } };
}
```

`src/auth/session.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/api/types';

export const SESSION_KEY = 'spynet.session';

export interface StoredSession {
  token: string;
  user: User;
}

export async function readSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
```

- [ ] **Step 4: Write `AuthProvider`**

`src/auth/AuthProvider.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { configureClient } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import type { RegisterInput, TokenResult, User } from '@/api/types';
import { clearSession, readSession, writeSession } from './session';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; token: string; user: User };

interface AuthContextValue {
  state: AuthState;
  login(email: string, password: string): Promise<{ challenge: string } | null>;
  completeTwoFactor(challenge: string, answer: { code?: string; recovery_code?: string }): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  signOutLocally(): Promise<void>;
  setUser(user: User): void;
  pendingHref: string | null;
  setPendingHref(href: string | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const deviceName = () => Device.deviceName ?? `${Platform.OS} device`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const signOutLocally = useCallback(async () => {
    tokenRef.current = null;
    await clearSession();
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  const signIn = useCallback(async ({ token, user }: TokenResult) => {
    tokenRef.current = token;
    await writeSession({ token, user });
    setState({ status: 'signedIn', token, user });
  }, []);

  useEffect(() => {
    configureClient({ getToken: () => tokenRef.current, onUnauthorized: () => void signOutLocally() });
  }, [signOutLocally]);

  // Restore the stored session immediately (works offline), then refresh the
  // user in the background; only a 401 ends the session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await readSession();
      if (cancelled) return;
      if (!session) {
        setState({ status: 'signedOut' });
        return;
      }
      tokenRef.current = session.token;
      setState({ status: 'signedIn', token: session.token, user: session.user });
      try {
        const user = await meApi.get();
        if (!cancelled && tokenRef.current === session.token) {
          await writeSession({ token: session.token, user });
          setState({ status: 'signedIn', token: session.token, user });
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) return; // offline or transient
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      pendingHref,
      setPendingHref,
      signOutLocally,
      async login(email, password) {
        const result = await authApi.login({ email, password, device_name: deviceName() });
        if ('two_factor' in result) return { challenge: result.challenge };
        await signIn(result);
        return null;
      },
      async completeTwoFactor(challenge, answer) {
        await signIn(await authApi.twoFactor({ challenge, ...answer }));
      },
      async register(input) {
        await signIn(await authApi.register({ ...input, device_name: deviceName() }));
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          // The local sign-out below is what matters to the user.
        }
        await signOutLocally();
      },
      setUser(user) {
        if (state.status !== 'signedIn') return;
        void writeSession({ token: state.token, user });
        setState({ ...state, user });
      },
    }),
    [state, pendingHref, signIn, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useSignedInUser(): User {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useSignedInUser requires a signed-in user');
  return state.user;
}
```

- [ ] **Step 5: Write the layouts and the deep-link route**

`app/(auth)/_layout.tsx`:

```tsx
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';

export default function AuthLayout() {
  const { state, pendingHref, setPendingHref } = useAuth();
  const signedIn = state.status === 'signedIn';

  useEffect(() => {
    if (signedIn && pendingHref) setPendingHref(null);
  }, [signedIn, pendingHref, setPendingHref]);

  if (signedIn) return <Redirect href={pendingHref ?? '/'} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/(app)/_layout.tsx`:

```tsx
import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';

export default function AppLayout() {
  const { state, setPendingHref } = useAuth();
  const pathname = usePathname();
  const signedOut = state.status === 'signedOut';

  // Remember a join link opened while signed out so the auth layout can send
  // the user there after they log in. Only join links: logging out from
  // Settings must not send the next login back to Settings.
  useEffect(() => {
    if (signedOut && pathname.startsWith('/join/')) setPendingHref(pathname);
  }, [signedOut, pathname, setPendingHref]);

  if (state.status === 'loading') return null;
  if (signedOut) return <Redirect href="/welcome" />;

  return <Stack />;
}
```

(Task 4 adds themed header options to this `Stack`.)

`app/(app)/join/[code].tsx`:

```tsx
import { Redirect, useLocalSearchParams } from 'expo-router';
import { isInviteCode, normalizeInviteCode } from '@/linking';

/** Target of spynet://join/{code}: never joins directly, only pre-fills the join screen. */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const normalized = normalizeInviteCode(code ?? '');

  if (!isInviteCode(normalized)) return <Redirect href="/spy/join" />;

  return <Redirect href={{ pathname: '/spy/join', params: { code: normalized } }} />;
}
```

Replace `app/_layout.tsx`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { bindQueryClientToAppState, createQueryClient } from '@/api/queryClient';
import { AuthProvider } from '@/auth/AuthProvider';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => bindQueryClientToAppState(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Move the placeholder: `mkdir -p "app/(app)" && git mv app/index.tsx "app/(app)/index.tsx"`. Create a minimal `app/(auth)/welcome.tsx` so the redirect target exists (Task 5 replaces it):

```tsx
import { Text } from 'react-native';

export default function Welcome() {
  return <Text>Welcome</Text>;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest tests/linking.test.ts tests/auth`
Expected: PASS.

- [ ] **Step 7: Run the full check and commit**

Run: `npm test` — expected PASS.

```bash
cd .. && git add expo-app && git commit -m "Add the auth provider, signed-in/out routing gate and join deep-link resume

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI components, server-error mapping for forms, and the in-app banner

**Files:**
- Create: `src/components/Screen.tsx`, `Button.tsx`, `TextField.tsx`, `FormTextField.tsx`, `Card.tsx`, `Badge.tsx`, `OnlineDot.tsx`, `FormError.tsx`, `EmptyState.tsx`, `AppText.tsx`
- Create: `src/banner/BannerProvider.tsx`
- Create: `src/forms/applyServerErrors.ts`
- Modify: `app/_layout.tsx` (add `BannerProvider`), `app/(app)/_layout.tsx` (themed headers), `tests/support/renderApp.tsx` (add `BannerProvider`)
- Test: `tests/forms/applyServerErrors.test.ts`, `tests/banner.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` (Task 1), `ValidationError`, `ApiError`, `NetworkError` (Task 2).
- Produces:
  - `<Screen title? scroll? refreshing? onRefresh? testID?>` — safe-area, themed background, optional pull-to-refresh
  - `<AppText variant?: 'body' | 'muted' | 'heading' | 'title' | 'mono'>`
  - `<Button label onPress variant?: 'primary' | 'secondary' | 'destructive' loading? disabled? testID?>`
  - `<TextField label error? ...TextInputProps>`; `<FormTextField control name label ...TextInputProps>` (react-hook-form `Controller` wrapper)
  - `<Card style? testID?>`, `<Badge label tone?: 'default' | 'muted'>`, `<OnlineDot online>`, `<FormError message?>`, `<EmptyState message>`
  - `applyServerErrors<T>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]): string | null` — sets field errors, returns a form-level message
  - `useBanner(): { showBanner(banner: { message: string; tone?: 'info' | 'error'; onPress?: () => void }): void }`

- [ ] **Step 1: Write the failing tests**

`tests/forms/applyServerErrors.test.ts`:

```ts
import { ApiError, NetworkError, ValidationError } from '@/api/errors';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { email: string; password: string };

test('field errors go to their fields, unknown keys become the form message', () => {
  const setError = jest.fn();
  const error = new ValidationError('Bad', { email: ['Taken.'], invitation: ['No longer available.'] });

  const message = applyServerErrors<Form>(error, setError, ['email', 'password']);

  expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken.' });
  expect(message).toBe('No longer available.');
});

test('non-validation errors become the form message', () => {
  const setError = jest.fn();

  expect(applyServerErrors<Form>(new NetworkError(), setError, ['email'])).toBe("Can't reach SpyNet. Check your connection.");
  expect(applyServerErrors<Form>(new ApiError(403, 'Forbidden.'), setError, ['email'])).toBe('Forbidden.');
  expect(applyServerErrors<Form>(new Error('boom'), setError, ['email'])).toBe('Something went wrong. Please try again.');
  expect(setError).not.toHaveBeenCalled();
});
```

`tests/banner.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { BannerProvider, useBanner } from '@/banner/BannerProvider';

function Trigger({ onPress }: { onPress: () => void }) {
  const { showBanner } = useBanner();
  return (
    <Pressable testID="trigger" onPress={() => showBanner({ message: 'SHADOW_FOX invited you', onPress })}>
      <Text>trigger</Text>
    </Pressable>
  );
}

test('shows a banner, runs its action on press, and auto-dismisses', () => {
  jest.useFakeTimers();
  const onPress = jest.fn();
  render(
    <BannerProvider>
      <Trigger onPress={onPress} />
    </BannerProvider>,
  );

  fireEvent.press(screen.getByTestId('trigger'));
  fireEvent.press(screen.getByText('SHADOW_FOX invited you'));
  expect(onPress).toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('trigger'));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.queryByText('SHADOW_FOX invited you')).toBeNull();
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/forms tests/banner.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `applyServerErrors` and `BannerProvider`**

`src/forms/applyServerErrors.ts`:

```ts
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, NetworkError, ValidationError } from '@/api/errors';

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (error instanceof ValidationError) {
    let formMessage: string | null = null;
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      if ((fields as readonly string[]).includes(key)) {
        setError(key as Path<T>, { type: 'server', message: messages[0] });
      } else {
        formMessage = messages[0] ?? error.message;
      }
    }
    return formMessage;
  }

  if (error instanceof NetworkError || error instanceof ApiError) return error.message;

  return 'Something went wrong. Please try again.';
}
```

`src/banner/BannerProvider.tsx`:

```tsx
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

interface Banner {
  message: string;
  tone?: 'info' | 'error';
  onPress?: () => void;
}

const BannerContext = createContext<{ showBanner(banner: Banner): void } | null>(null);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const { colors, spacing, radius, fontSize } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const showBanner = useCallback((next: Banner) => setBanner(next), []);
  const value = useMemo(() => ({ showBanner }), [showBanner]);

  return (
    <BannerContext.Provider value={value}>
      {children}
      {banner ? (
        <Pressable
          testID="banner"
          accessibilityRole="alert"
          onPress={() => {
            setBanner(null);
            banner.onPress?.();
          }}
          style={[
            styles.banner,
            {
              top: insets.top + spacing.sm,
              marginHorizontal: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: banner.tone === 'error' ? colors.destructive : colors.primary,
            },
          ]}
        >
          <Text
            style={{
              color: banner.tone === 'error' ? colors.destructiveForeground : colors.primaryForeground,
              fontSize: fontSize.md,
            }}
          >
            {banner.message}
          </Text>
        </Pressable>
      ) : null}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  const context = useContext(BannerContext);
  if (!context) throw new Error('useBanner must be used inside BannerProvider');
  return context;
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 0, right: 0, zIndex: 100, elevation: 6 },
});
```

(`useSafeAreaInsets` works in tests through the `react-native-safe-area-context` mock registered in `jest.setup.ts` in Task 1.)

- [ ] **Step 4: Write the components**

`src/components/AppText.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';

type Variant = 'body' | 'muted' | 'heading' | 'title' | 'mono';

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const { colors, fontSize } = useTheme();
  const variants = {
    body: { color: colors.foreground, fontSize: fontSize.md },
    muted: { color: colors.mutedForeground, fontSize: fontSize.sm },
    heading: { color: colors.foreground, fontSize: fontSize.lg, fontWeight: '600' as const },
    title: { color: colors.foreground, fontSize: fontSize.xl, fontWeight: '700' as const },
    mono: { color: colors.foreground, fontSize: fontSize.mono, fontFamily: 'Courier', fontWeight: '700' as const },
  };
  return <Text style={[variants[variant], style]} {...props} />;
}
```

`src/components/Screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface Props {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export function Screen({ children, title, scroll = true, refreshing = false, onRefresh, testID }: Props) {
  const { colors, spacing } = useTheme();
  const content = (
    <View style={{ gap: spacing.lg, padding: spacing.lg }}>
      {title ? <AppText variant="title">{title}</AppText> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView testID={testID} edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
```

`src/components/Button.tsx`:

```tsx
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, testID }: Props) {
  const { colors, spacing, radius, fontSize } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.bg,
        opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        alignItems: 'center',
      })}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={{ color: palette.fg, fontSize: fontSize.md, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}
```

`src/components/TextField.tsx`:

```tsx
import { TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export function TextField({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  const { colors, spacing, radius, fontSize } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="muted">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.destructive : colors.input,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.foreground,
            fontSize: fontSize.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? <AppText style={{ color: colors.destructive }}>{error}</AppText> : null}
    </View>
  );
}
```

`src/components/FormTextField.tsx`:

```tsx
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import { TextField } from './TextField';

type Props<T extends FieldValues> = TextInputProps & { control: Control<T>; name: Path<T>; label: string };

export function FormTextField<T extends FieldValues>({ control, name, label, ...props }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <TextField
          label={label}
          value={value == null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message}
          {...props}
        />
      )}
    />
  );
}
```

`src/components/Card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function Card({ children, style, testID }: { children: ReactNode; style?: ViewStyle; testID?: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

`src/components/Badge.tsx`:

```tsx
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'muted' }) {
  const { colors, spacing, radius, fontSize } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tone === 'muted' ? colors.muted : colors.secondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.sm,
      }}
    >
      <Text style={{ color: tone === 'muted' ? colors.mutedForeground : colors.secondaryForeground, fontSize: fontSize.sm }}>
        {label}
      </Text>
    </View>
  );
}
```

`src/components/OnlineDot.tsx`:

```tsx
import { View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export function OnlineDot({ online }: { online: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={online ? 'Online' : 'Offline'}
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.online : colors.border }}
    />
  );
}
```

`src/components/FormError.tsx`:

```tsx
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <AppText testID="form-error" accessibilityRole="alert" style={{ color: colors.destructive }}>
      {message}
    </AppText>
  );
}
```

`src/components/EmptyState.tsx`:

```tsx
import { AppText } from './AppText';

export function EmptyState({ message }: { message: string }) {
  return <AppText variant="muted">{message}</AppText>;
}
```

- [ ] **Step 5: Wire the banner and themed headers**

`app/_layout.tsx` — wrap `<Slot />` so the banner sits above every screen:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bindQueryClientToAppState, createQueryClient } from '@/api/queryClient';
import { AuthProvider } from '@/auth/AuthProvider';
import { BannerProvider } from '@/banner/BannerProvider';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => bindQueryClientToAppState(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BannerProvider>
            <Slot />
          </BannerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

In `app/(app)/_layout.tsx`, add `import { useTheme } from '@/theme/useTheme';`, call `const { colors } = useTheme();` at the top of the component, and replace `return <Stack />;` with:

```tsx
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
```

In `tests/support/renderApp.tsx`, import `BannerProvider` and wrap: `<AuthProvider><BannerProvider>{children}</BannerProvider></AuthProvider>`.

- [ ] **Step 6: Run the tests and the full check**

Run: `npx jest tests/forms tests/banner.test.tsx && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add themed UI components, form server-error mapping and the in-app banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Auth screens (welcome, login, two-factor, register, forgot password)

**Files:**
- Replace: `app/(auth)/welcome.tsx`
- Create: `app/(auth)/login.tsx`, `app/(auth)/two-factor.tsx`, `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`
- Test: `tests/screens/login.test.tsx`, `tests/screens/register.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3), components and `applyServerErrors` (Task 4), `authApi.forgotPassword` (Task 2).
- Produces: routes `/welcome`, `/login`, `/two-factor?challenge=…`, `/register`, `/forgot-password`. testIDs used by Maestro: `btn-welcome-login`, `btn-welcome-register`, `input-email`, `input-password`, `input-name`, `input-password-confirmation`, `btn-login`, `btn-register`, `input-2fa-code`, `btn-2fa-submit`.

- [ ] **Step 1: Write the failing tests**

`tests/screens/login.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';
import Login from '../../app/(auth)/login';
import TwoFactor from '../../app/(auth)/two-factor';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/login': Login,
  '(auth)/two-factor': TwoFactor,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
};

async function submitLogin() {
  fireEvent.changeText(screen.getByTestId('input-email'), 'ada@example.com');
  fireEvent.changeText(screen.getByTestId('input-password'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-login'));
  });
}

test('a successful login lands on the game picker', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();

  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('a 2FA user is taken to the code screen and completes sign-in', async () => {
  jest.mocked(authApi.login).mockResolvedValue({ two_factor: true, challenge: 'c'.repeat(40) });
  jest.mocked(authApi.twoFactor).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();
  await waitFor(() => expect(screen).toHavePathname('/two-factor'));

  fireEvent.changeText(screen.getByTestId('input-2fa-code'), '123456');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-2fa-submit'));
  });

  expect(authApi.twoFactor).toHaveBeenCalledWith({ challenge: 'c'.repeat(40), code: '123456' });
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('invalid credentials show the field error', async () => {
  jest.mocked(authApi.login).mockRejectedValue(new ValidationError('x', { email: ['These credentials do not match our records.'] }));
  await renderApp(routes, { initialUrl: '/login' });
  await screen.findByTestId('btn-login');

  await submitLogin();

  expect(await screen.findByText('These credentials do not match our records.')).toBeOnTheScreen();
});
```

`tests/screens/register.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import AuthLayout from '../../app/(auth)/_layout';
import Register from '../../app/(auth)/register';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/register': Register,
  '(app)/_layout': AppLayout,
  '(app)/index': () => <Text>picker</Text>,
};

async function fillAndSubmit() {
  fireEvent.changeText(screen.getByTestId('input-name'), 'Ada');
  fireEvent.changeText(screen.getByTestId('input-email'), 'ada@example.com');
  fireEvent.changeText(screen.getByTestId('input-password'), 'password');
  fireEvent.changeText(screen.getByTestId('input-password-confirmation'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-register'));
  });
}

test('registering signs in and lands on the picker', async () => {
  jest.mocked(authApi.register).mockResolvedValue({ token: 't', user: fakeUser });
  await renderApp(routes, { initialUrl: '/register' });
  await screen.findByTestId('btn-register');

  await fillAndSubmit();

  expect(authApi.register).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Ada', email: 'ada@example.com', password: 'password', password_confirmation: 'password' }),
  );
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('server validation errors appear on their fields', async () => {
  jest.mocked(authApi.register).mockRejectedValue(new ValidationError('x', { email: ['The email has already been taken.'] }));
  await renderApp(routes, { initialUrl: '/register' });
  await screen.findByTestId('btn-register');

  await fillAndSubmit();

  expect(await screen.findByText('The email has already been taken.')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/screens/login.test.tsx tests/screens/register.test.tsx`
Expected: FAIL — `Cannot find module '../../app/(auth)/login'`.

- [ ] **Step 3: Write the screens**

`app/(auth)/welcome.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ gap: 8, marginTop: 96 }}>
        <AppText variant="title">SpyNet</AppText>
        <AppText variant="muted">Social-deduction party games. Find the mole before time runs out.</AppText>
      </View>
      <Button testID="btn-welcome-login" label="Log in" onPress={() => router.push('/login')} />
      <Button testID="btn-welcome-register" label="Create an account" variant="secondary" onPress={() => router.push('/register')} />
    </Screen>
  );
}
```

`app/(auth)/login.tsx`:

```tsx
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { email: string; password: string };

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const result = await login(email.trim(), password);
      if (result) router.push({ pathname: '/two-factor', params: { challenge: result.challenge } });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email', 'password']));
    }
  });

  return (
    <Screen title="Log in">
      <FormTextField control={control} name="email" label="Email" testID="input-email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <FormTextField control={control} name="password" label="Password" testID="input-password" secureTextEntry autoComplete="password" />
      <FormError message={formError} />
      <Button testID="btn-login" label="Log in" loading={formState.isSubmitting} onPress={onSubmit} />
      <Link href="/forgot-password">
        <AppText variant="muted">Forgot your password?</AppText>
      </Link>
    </Screen>
  );
}
```

`app/(auth)/two-factor.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { code: string };

export default function TwoFactor() {
  const { challenge } = useLocalSearchParams<{ challenge: string }>();
  const { completeTwoFactor } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<Form>({ defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    try {
      await completeTwoFactor(challenge, useRecovery ? { recovery_code: code.trim() } : { code: code.trim() });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['code']));
    }
  });

  return (
    <Screen title="Two-factor authentication">
      <AppText variant="muted">
        {useRecovery ? 'Enter one of your emergency recovery codes.' : 'Enter the code from your authenticator app.'}
      </AppText>
      <FormTextField
        control={control}
        name="code"
        label={useRecovery ? 'Recovery code' : 'Code'}
        testID="input-2fa-code"
        autoCapitalize="none"
        keyboardType={useRecovery ? 'default' : 'number-pad'}
        autoComplete="one-time-code"
      />
      <FormError message={formError} />
      <Button testID="btn-2fa-submit" label="Continue" loading={formState.isSubmitting} onPress={onSubmit} />
      <Pressable
        onPress={() => {
          setUseRecovery(!useRecovery);
          reset({ code: '' });
        }}
      >
        <AppText variant="muted">{useRecovery ? 'Use an authentication code' : 'Use a recovery code'}</AppText>
      </Pressable>
    </Screen>
  );
}
```

(A `challenge` error means the 5-minute window expired; the message from the server tells the user to log in again, and it renders through `FormError`.)

`app/(auth)/register.tsx`:

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { RegisterInput } from '@/api/types';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

export default function Register() {
  const { register } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<RegisterInput>({
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await register({ ...input, name: input.name.trim(), email: input.email.trim() });
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'email', 'password', 'password_confirmation']));
    }
  });

  return (
    <Screen title="Create an account">
      <FormTextField control={control} name="name" label="Name" testID="input-name" autoComplete="name" />
      <FormTextField control={control} name="email" label="Email" testID="input-email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <FormTextField control={control} name="password" label="Password" testID="input-password" secureTextEntry autoComplete="new-password" />
      <FormTextField control={control} name="password_confirmation" label="Confirm password" testID="input-password-confirmation" secureTextEntry autoComplete="new-password" />
      <FormError message={formError} />
      <Button testID="btn-register" label="Create account" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
```

`app/(auth)/forgot-password.tsx`:

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { email: string };

export default function ForgotPassword() {
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      setSent((await authApi.forgotPassword(email.trim())).message);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email']));
    }
  });

  return (
    <Screen title="Reset your password">
      <AppText variant="muted">We'll email you a link. You'll finish resetting your password in your browser.</AppText>
      <FormTextField control={control} name="email" label="Email" autoCapitalize="none" keyboardType="email-address" />
      <FormError message={formError} />
      {sent ? <AppText>{sent}</AppText> : null}
      <Button label="Send reset link" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass, then the full check**

Run: `npx jest tests/screens && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add the welcome, login, two-factor, register and forgot-password screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Game picker, Spy home, create operation, and join operation

**Files:**
- Replace: `app/(app)/index.tsx`
- Create: `app/(app)/spy/index.tsx`, `app/(app)/spy/create.tsx`, `app/(app)/spy/join.tsx`
- Create: `app/(app)/games/[code]/index.tsx` (temporary stub that prints the code — replaced in Task 7)
- Test: `tests/screens/spyHome.test.tsx`, `tests/screens/createGame.test.tsx`, `tests/screens/joinGame.test.tsx`

**Interfaces:**
- Consumes: query hooks (Task 2), components (Task 4), `normalizeInviteCode`, `isInviteCode` (Task 3).
- Produces: routes `/`, `/spy?highlight=…`, `/spy/create`, `/spy/join?code=…`. testIDs: `tile-spy`, `btn-open-create`, `btn-open-join`, `input-game-title`, `mode-mole|mode-codebreaker|mode-counterintel`, `btn-players-minus`, `btn-players-plus`, `players-count`, `input-mission-briefing`, `btn-create-game`, `input-join-code`, `btn-join-game`, `invitation-{id}`, `btn-accept-{id}`, `btn-decline-{id}`, `operation-{code}`, `btn-settings`.

- [ ] **Step 1: Write the failing tests**

`tests/screens/spyHome.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import SpyHome from '../../app/(app)/spy/index';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/index': SpyHome,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

const invitation = { id: 5, status: 'pending' as const, game_title: 'Op Sunrise', game_code: 'SPY-ZZ22', from_codename: 'NIGHT_HAWK', created_at: null };

test('lists operations and pending invitations, highlighting the pushed one', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [fakeGame()], pending_invitations: [invitation] });

  await renderApp(routes, { initialUrl: '/spy?highlight=5', user: fakeUser });

  expect(await screen.findByText('Operation Nightfall')).toBeOnTheScreen();
  expect(screen.getByText('NIGHT_HAWK invited you to Op Sunrise')).toBeOnTheScreen();
  expect(screen.getByTestId('invitation-5')).toHaveStyle({ borderWidth: 2 });
});

test('accepting an invitation opens its lobby', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [], pending_invitations: [invitation] });
  jest.mocked(gamesApi.accept).mockResolvedValue(fakeGame({ code: 'SPY-ZZ22' }));
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  await act(async () => {
    fireEvent.press(await screen.findByTestId('btn-accept-5'));
  });

  await waitFor(() => expect(screen).toHavePathname('/games/SPY-ZZ22'));
});

test('declining removes the invitation after refetch', async () => {
  jest.mocked(gamesApi.spyHome)
    .mockResolvedValueOnce({ games: [], pending_invitations: [invitation] })
    .mockResolvedValue({ games: [], pending_invitations: [] });
  jest.mocked(gamesApi.decline).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/spy', user: fakeUser });

  await act(async () => {
    fireEvent.press(await screen.findByTestId('btn-decline-5'));
  });

  await waitFor(() => expect(screen.queryByTestId('invitation-5')).toBeNull());
});
```

`tests/screens/createGame.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import CreateGame from '../../app/(app)/spy/create';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/create': CreateGame,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

test('creates an operation with the chosen settings and opens the lobby', async () => {
  jest.mocked(gamesApi.create).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-game-title'), 'Operation Nightfall');
  fireEvent.press(screen.getByTestId('mode-codebreaker'));
  fireEvent.press(screen.getByTestId('btn-players-plus'));
  fireEvent.changeText(screen.getByTestId('input-mission-briefing'), 'Find the mole.');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-create-game'));
  });

  expect(gamesApi.create).toHaveBeenCalledWith({
    title: 'Operation Nightfall',
    game_mode: 'codebreaker',
    max_players: 7,
    mission_briefing: 'Find the mole.',
  });
  await waitFor(() => expect(screen).toHavePathname('/games/SPY-AB3D'));
});

test('player count stays within 3 to 12', async () => {
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });
  await screen.findByTestId('players-count');

  for (let i = 0; i < 10; i++) fireEvent.press(screen.getByTestId('btn-players-plus'));
  expect(screen.getByTestId('players-count')).toHaveTextContent('12');

  for (let i = 0; i < 15; i++) fireEvent.press(screen.getByTestId('btn-players-minus'));
  expect(screen.getByTestId('players-count')).toHaveTextContent('3');
});

test('server field errors show on the form', async () => {
  jest.mocked(gamesApi.create).mockRejectedValue(
    new ValidationError('x', { title: ['The title field is required.'], mission_briefing: ['The mission briefing field is required.'] }),
  );
  await renderApp(routes, { initialUrl: '/spy/create', user: fakeUser });

  await act(async () => {
    fireEvent.press(await screen.findByTestId('btn-create-game'));
  });

  expect(await screen.findByText('The title field is required.')).toBeOnTheScreen();
  expect(screen.getByText('The mission briefing field is required.')).toBeOnTheScreen();
});
```

`tests/screens/joinGame.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError, ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import JoinGame from '../../app/(app)/spy/join';
import { fakeGame, fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(app)/_layout': AppLayout,
  '(app)/spy/join': JoinGame,
  '(app)/games/[code]/index': () => <Text>lobby</Text>,
};

async function submit() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-join-game'));
  });
}

test('trims and uppercases the code before joining', async () => {
  jest.mocked(gamesApi.join).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/spy/join', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-join-code'), '  spy-ab3d ');
  await submit();

  expect(gamesApi.join).toHaveBeenCalledWith('SPY-AB3D');
  await waitFor(() => expect(screen).toHavePathname('/games/SPY-AB3D'));
});

test('a deep-linked code is pre-filled and waits for confirmation', async () => {
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-AB3D', user: fakeUser });

  expect(await screen.findByDisplayValue('SPY-AB3D')).toBeOnTheScreen();
  expect(screen.getByText('Join operation SPY-AB3D?')).toBeOnTheScreen();
  expect(gamesApi.join).not.toHaveBeenCalled();
});

test('a full roster shows the server message', async () => {
  jest.mocked(gamesApi.join).mockRejectedValue(new ValidationError('x', { code: ['This operation roster is already full.'] }));
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-AB3D', user: fakeUser });
  await screen.findByTestId('btn-join-game');

  await submit();

  expect(await screen.findByText('This operation roster is already full.')).toBeOnTheScreen();
});

test('an unknown code shows the web wording', async () => {
  jest.mocked(gamesApi.join).mockRejectedValue(new ApiError(404, 'Not Found'));
  await renderApp(routes, { initialUrl: '/spy/join?code=SPY-ZZZZ', user: fakeUser });
  await screen.findByTestId('btn-join-game');

  await submit();

  expect(await screen.findByText('No operation found with that invite code.')).toBeOnTheScreen();
});

test('a malformed code is rejected before calling the API', async () => {
  await renderApp(routes, { initialUrl: '/spy/join', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-join-code'), 'hello');
  await submit();

  expect(gamesApi.join).not.toHaveBeenCalled();
  expect(await screen.findByText('Invite codes look like SPY-AB3D.')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/screens/spyHome.test.tsx tests/screens/createGame.test.tsx tests/screens/joinGame.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the picker and Spy home**

`app/(app)/index.tsx`:

```tsx
import { Link, Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function GamePicker() {
  const router = useRouter();

  return (
    <Screen title="Choose a Game">
      <Stack.Screen
        options={{
          title: 'Games',
          headerRight: () => (
            <Link href="/settings" testID="btn-settings">
              <AppText>Settings</AppText>
            </Link>
          ),
        }}
      />
      <Pressable testID="tile-spy" accessibilityRole="button" onPress={() => router.push('/spy')}>
        <Card>
          <AppText variant="heading">Spy</AppText>
          <AppText variant="muted">A social-deduction party game. Find the mole before time runs out.</AppText>
        </Card>
      </Pressable>
      {[0, 1].map((i) => (
        <Card key={i} testID={`tile-coming-soon-${i}`} style={{ opacity: 0.5, borderStyle: 'dashed' }}>
          <AppText variant="heading">Coming Soon</AppText>
        </Card>
      ))}
    </Screen>
  );
}
```

`app/(app)/spy/index.tsx`:

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useAcceptInvitation, useDeclineInvitation, useRefreshOnFocus, useSpyHome } from '@/api/queries';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useTheme } from '@/theme/useTheme';

export default function SpyHome() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const { colors, spacing } = useTheme();
  const { showBanner } = useBanner();
  const home = useSpyHome();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  useRefreshOnFocus(home.refetch);

  const onError = (error: unknown) =>
    showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Something went wrong.' });

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => void home.refetch()}>
      <Stack.Screen options={{ title: 'Spy' }} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button testID="btn-open-create" label="Create Operation" onPress={() => router.push('/spy/create')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID="btn-open-join" label="Join Operation" variant="secondary" onPress={() => router.push('/spy/join')} />
        </View>
      </View>

      {home.error ? <FormError message={applyServerErrors(home.error, () => {}, [])} /> : null}

      <AppText variant="heading">Pending Invitations</AppText>
      {home.data?.pending_invitations.length ? (
        home.data.pending_invitations.map((invitation) => (
          <Card
            key={invitation.id}
            testID={`invitation-${invitation.id}`}
            style={String(invitation.id) === highlight ? { borderWidth: 2, borderColor: colors.ring } : undefined}
          >
            <AppText>
              {invitation.from_codename} invited you to {invitation.game_title}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-accept-${invitation.id}`}
                  label="Accept"
                  loading={accept.isPending && accept.variables === invitation.id}
                  onPress={() =>
                    accept.mutate(invitation.id, {
                      onSuccess: (game) => router.push(`/games/${game.code}`),
                      onError,
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  testID={`btn-decline-${invitation.id}`}
                  label="Decline"
                  variant="secondary"
                  loading={decline.isPending && decline.variables === invitation.id}
                  onPress={() => decline.mutate(invitation.id, { onError })}
                />
              </View>
            </View>
          </Card>
        ))
      ) : (
        <EmptyState message={home.isLoading ? 'Loading…' : 'No pending invitations.'} />
      )}

      <AppText variant="heading">Your Operations</AppText>
      {home.data?.games.length ? (
        home.data.games.map((game) => (
          <Pressable key={game.id} testID={`operation-${game.code}`} onPress={() => router.push(`/games/${game.code}`)}>
            <Card>
              <AppText variant="heading">{game.title}</AppText>
              <AppText variant="muted">
                {game.code} · {game.player_count} / {game.max_players} operatives · {game.status}
              </AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <EmptyState message={home.isLoading ? 'Loading…' : 'No operations yet. Create one or join by code.'} />
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Write create and join**

`app/(app)/spy/create.tsx`:

```tsx
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { useCreateGame } from '@/api/queries';
import type { CreateGameInput, GameMode } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useTheme } from '@/theme/useTheme';

const MODES: { value: GameMode; label: string }[] = [
  { value: 'mole', label: 'Mole' },
  { value: 'codebreaker', label: 'Codebreaker' },
  { value: 'counterintel', label: 'Counterintel' },
];
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

export default function CreateGame() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const createGame = useCreateGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<CreateGameInput>({
    defaultValues: { title: '', game_mode: 'mole', max_players: 6, mission_briefing: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const game = await createGame.mutateAsync({ ...input, title: input.title.trim(), mission_briefing: input.mission_briefing.trim() });
      router.replace(`/games/${game.code}`);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['title', 'game_mode', 'max_players', 'mission_briefing']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Create Operation' }} />
      <FormTextField control={control} name="title" label="Operation title" placeholder="Operation title" testID="input-game-title" />

      <Controller
        control={control}
        name="game_mode"
        render={({ field: { value, onChange } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">Mode</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {MODES.map((mode) => (
                <Pressable
                  key={mode.value}
                  testID={`mode-${mode.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === mode.value }}
                  onPress={() => onChange(mode.value)}
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: value === mode.value ? colors.primary : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <AppText>{mode.label}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="max_players"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="muted">Max operatives</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Button testID="btn-players-minus" label="−" variant="secondary" onPress={() => onChange(Math.max(MIN_PLAYERS, value - 1))} />
              <AppText testID="players-count" variant="heading">{String(value)}</AppText>
              <Button testID="btn-players-plus" label="+" variant="secondary" onPress={() => onChange(Math.min(MAX_PLAYERS, value + 1))} />
            </View>
            {error ? <AppText style={{ color: colors.destructive }}>{error.message}</AppText> : null}
          </View>
        )}
      />

      <FormTextField
        control={control}
        name="mission_briefing"
        label="Mission briefing"
        testID="input-mission-briefing"
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: 'top' }}
      />
      <FormError message={formError} />
      <Button testID="btn-create-game" label="Create Operation" loading={createGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
```

`app/(app)/spy/join.tsx`:

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/errors';
import { useJoinGame } from '@/api/queries';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { isInviteCode, normalizeInviteCode } from '@/linking';

type Form = { code: string };

export default function JoinGame() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const joinGame = useJoinGame();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<Form>({ defaultValues: { code: params.code ?? '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    setFormError(null);
    const normalized = normalizeInviteCode(code);
    if (!isInviteCode(normalized)) {
      setError('code', { type: 'format', message: 'Invite codes look like SPY-AB3D.' });
      return;
    }
    try {
      const game = await joinGame.mutateAsync(normalized);
      router.replace(`/games/${game.code}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setError('code', { type: 'server', message: 'No operation found with that invite code.' });
        return;
      }
      setFormError(applyServerErrors(error, setError, ['code']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Join Operation' }} />
      {params.code ? <AppText variant="heading">Join operation {params.code}?</AppText> : null}
      <FormTextField
        control={control}
        name="code"
        label="Invite code"
        placeholder="SPY-XXXX"
        testID="input-join-code"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <FormError message={formError} />
      <Button testID="btn-join-game" label="Join Operation" loading={joinGame.isPending} onPress={onSubmit} />
    </Screen>
  );
}
```

Temporary `app/(app)/games/[code]/index.tsx` (Task 7 replaces it):

```tsx
import { useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Screen>
      <AppText>{code}</AppText>
    </Screen>
  );
}
```

- [ ] **Step 5: Run the tests, then the full check**

Run: `npx jest tests/screens && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add the game picker, Spy home, create operation and join operation screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Realtime (presence, invitation banner, live lobby), lobby screen, and invite players

**Files:**
- Create: `src/realtime/echo.ts`, `src/realtime/RealtimeProvider.tsx`, `src/realtime/sortByPresence.ts`
- Modify: `app/_layout.tsx` (add `RealtimeProvider`), `tests/support/renderApp.tsx` (add `RealtimeProvider`), `jest.setup.ts` (mock `@/realtime/echo`)
- Create: `tests/support/fakeEcho.ts`
- Replace: `app/(app)/games/[code]/index.tsx`
- Create: `app/(app)/games/[code]/invite.tsx`
- Test: `tests/realtime/sortByPresence.test.ts`, `tests/realtime/RealtimeProvider.test.tsx`, `tests/screens/lobby.test.tsx`, `tests/screens/invite.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3), `useBanner()` (Task 4), query hooks and `queryKeys` (Task 2), Plan A channels `presence-online-users`, `private-user.{id}` (`.invitation.sent`), `private-game.{id}` (`.player.joined`).
- Produces:
  - `createEcho(token: string): EchoClient`
  - `<RealtimeProvider>`; `useOnlineUserIds(): Set<number>`; `useGameChannel(gameId: number | undefined, onPlayerJoined: (payload: PlayerJoinedPayload) => void): void`
  - `sortByPresence<T extends { id: number; name: string }>(users: T[], online: Set<number>): T[]`
  - testIDs: `lobby-code`, `btn-share`, `btn-invite-players`, `roster-{userId}`, `not-on-operation`, `btn-join-from-lobby`, `invitable-{userId}`, `btn-invite-{userId}`

- [ ] **Step 1: Write the failing tests**

`tests/support/fakeEcho.ts`:

```ts
type Handler = (payload: unknown) => void;

/** In-memory stand-in for a laravel-echo instance, with helpers to emit events. */
export function createFakeEcho() {
  const listeners = new Map<string, Handler>();
  let presence: { here?: Handler; joining?: Handler; leaving?: Handler } = {};

  const channel = (name: string) => ({
    listen(event: string, handler: Handler) {
      listeners.set(`${name}:${event}`, handler);
      return this;
    },
  });

  const presenceChannel = {
    here(handler: Handler) {
      presence.here = handler;
      return presenceChannel;
    },
    joining(handler: Handler) {
      presence.joining = handler;
      return presenceChannel;
    },
    leaving(handler: Handler) {
      presence.leaving = handler;
      return presenceChannel;
    },
  };

  return {
    private: jest.fn((name: string) => channel(`private-${name}`)),
    join: jest.fn(() => presenceChannel),
    leave: jest.fn((name: string) => {
      for (const key of [...listeners.keys()]) if (key.startsWith(`private-${name}:`)) listeners.delete(key);
    }),
    disconnect: jest.fn(),
    connector: { pusher: { connect: jest.fn(), disconnect: jest.fn() } },
    emit(channelName: string, event: string, payload: unknown) {
      listeners.get(`${channelName}:${event}`)?.(payload);
    },
    presence: {
      here: (members: { id: number }[]) => presence.here?.(members),
      joining: (member: { id: number }) => presence.joining?.(member),
      leaving: (member: { id: number }) => presence.leaving?.(member),
    },
    reset() {
      listeners.clear();
      presence = {};
    },
  };
}

export type FakeEcho = ReturnType<typeof createFakeEcho>;
```

Append to `jest.setup.ts`:

```ts
jest.mock('@/realtime/echo', () => {
  const { createFakeEcho } = jest.requireActual('./tests/support/fakeEcho');
  const echo = createFakeEcho();
  return { createEcho: jest.fn(() => echo), __echo: echo };
});

beforeEach(() => {
  jest.requireMock<{ __echo: { reset(): void } }>('@/realtime/echo').__echo.reset();
});
```

`tests/realtime/sortByPresence.test.ts`:

```ts
import { sortByPresence } from '@/realtime/sortByPresence';

test('online users first, each group alphabetical, input untouched', () => {
  const users = [
    { id: 1, name: 'Charlie' },
    { id: 2, name: 'alpha' },
    { id: 3, name: 'Bravo' },
    { id: 4, name: 'Delta' },
  ];

  const sorted = sortByPresence(users, new Set([4, 3]));

  expect(sorted.map((u) => u.id)).toEqual([3, 4, 2, 1]);
  expect(users[0].id).toBe(1);
});
```

`tests/realtime/RealtimeProvider.test.tsx`:

```tsx
import { act, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import AppLayout from '../../app/(app)/_layout';
import { fakeUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

function OnlineCount() {
  return <Text testID="online">{String(useOnlineUserIds().size)}</Text>;
}

const routes = { '(app)/_layout': AppLayout, '(app)/index': OnlineCount, '(app)/spy/index': () => <Text>spy</Text> };

test('tracks presence and shows a banner for a live invitation', async () => {
  jest.mocked(gamesApi.spyHome).mockResolvedValue({ games: [], pending_invitations: [] });
  await renderApp(routes, { initialUrl: '/', user: fakeUser });
  await waitFor(() => expect(echo.join).toHaveBeenCalledWith('online-users'));

  act(() => echo.presence.here([{ id: 1 }, { id: 2 }]));
  expect(screen.getByTestId('online')).toHaveTextContent('2');
  act(() => echo.presence.leaving({ id: 2 }));
  expect(screen.getByTestId('online')).toHaveTextContent('1');

  act(() =>
    echo.emit(`private-user.${fakeUser.id}`, '.invitation.sent', {
      invitation_id: 9,
      game_title: 'Op Sunrise',
      game_code: 'SPY-ZZ22',
      from_codename: 'NIGHT_HAWK',
    }),
  );
  expect(await screen.findByText('NIGHT_HAWK invited you to Op Sunrise')).toBeOnTheScreen();
});
```

`tests/screens/lobby.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Share } from 'react-native';
import { gamesApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import Lobby from '../../app/(app)/games/[code]/index';
import { fakeGame, fakeUser, otherUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/index': Lobby };

test('shows the roster and refetches when a player joins live', async () => {
  const joined = fakeGame({
    player_count: 2,
    players: [...fakeGame().players!, { id: 101, user: otherUser, is_host: false, status: 'ready', joined_at: null }],
  });
  jest.mocked(gamesApi.show).mockResolvedValueOnce(fakeGame()).mockResolvedValue(joined);
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByTestId('roster-1')).toBeOnTheScreen();
  expect(screen.getByTestId('lobby-code')).toHaveTextContent('SPY-AB3D');
  await waitFor(() => expect(echo.private).toHaveBeenCalledWith('game.10'));

  act(() => echo.emit('private-game.10', '.player.joined', { player: joined.players![1], player_count: 2 }));

  expect(await screen.findByTestId('roster-2')).toBeOnTheScreen();
});

test('the host sees Invite Players while recruiting; others do not', async () => {
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame({ host_id: otherUser.id, host: otherUser }));
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await screen.findByTestId('lobby-code');
  expect(screen.queryByTestId('btn-invite-players')).toBeNull();
});

test('share sends the code and the deep link', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  jest.mocked(gamesApi.show).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  await act(async () => {
    fireEvent.press(await screen.findByTestId('btn-share'));
  });

  expect(share.mock.calls[0][0].message).toContain('SPY-AB3D');
  expect(share.mock.calls[0][0].message).toContain('spynet://join/SPY-AB3D');
});

test('a non-member sees an explicit join prompt and can join', async () => {
  jest.mocked(gamesApi.show).mockRejectedValueOnce(new ApiError(403, 'This action is unauthorized.')).mockResolvedValue(fakeGame());
  jest.mocked(gamesApi.join).mockResolvedValue(fakeGame());
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D', user: fakeUser });

  expect(await screen.findByText("You're not on this operation")).toBeOnTheScreen();
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-join-from-lobby'));
  });

  expect(gamesApi.join).toHaveBeenCalledWith('SPY-AB3D');
  expect(await screen.findByTestId('roster-1')).toBeOnTheScreen();
});
```

`tests/screens/invite.test.tsx`:

```tsx
import { act, fireEvent, screen, within } from 'expo-router/testing-library';
import { gamesApi } from '@/api/endpoints';
import AppLayout from '../../app/(app)/_layout';
import Invite from '../../app/(app)/games/[code]/invite';
import { fakeUser } from '../support/fakes';
import type { FakeEcho } from '../support/fakeEcho';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');
const echo = jest.requireMock<{ __echo: FakeEcho }>('@/realtime/echo').__echo;

const routes = { '(app)/_layout': AppLayout, '(app)/games/[code]/invite': Invite };

test('lists online users first and re-sorts live; invites and shows Pending', async () => {
  jest.mocked(gamesApi.invitableUsers)
    .mockResolvedValueOnce([
      { id: 2, name: 'Alpha', codename: 'NIGHT_HAWK', invite_status: null },
      { id: 3, name: 'Bravo', codename: 'VIPER_ONE', invite_status: null },
    ])
    .mockResolvedValue([
      { id: 2, name: 'Alpha', codename: 'NIGHT_HAWK', invite_status: null },
      { id: 3, name: 'Bravo', codename: 'VIPER_ONE', invite_status: 'pending' },
    ]);
  jest.mocked(gamesApi.invite).mockResolvedValue({ id: 1, status: 'pending', game_title: 'X', game_code: 'SPY-AB3D', from_codename: 'SHADOW_FOX', created_at: null });
  await renderApp(routes, { initialUrl: '/games/SPY-AB3D/invite', user: fakeUser });

  await screen.findByTestId('invitable-2');
  const order = () => screen.getAllByTestId(/^invitable-/).map((node) => node.props.testID);
  expect(order()).toEqual(['invitable-2', 'invitable-3']);

  act(() => echo.presence.here([{ id: 3 }]));
  expect(order()).toEqual(['invitable-3', 'invitable-2']);

  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-invite-3'));
  });

  expect(gamesApi.invite).toHaveBeenCalledWith('SPY-AB3D', 3);
  expect(await within(screen.getByTestId('invitable-3')).findByText('Pending')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/realtime tests/screens/lobby.test.tsx tests/screens/invite.test.tsx`
Expected: FAIL — `Cannot find module '@/realtime/sortByPresence'` / `RealtimeProvider`.

- [ ] **Step 3: Write the realtime layer**

`src/realtime/echo.ts`:

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import { API_URL, PUSHER_CLUSTER, PUSHER_KEY } from '@/config';

export type EchoClient = Echo<'pusher'>;

export function createEcho(token: string): EchoClient {
  const client = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    channelAuthorization: {
      endpoint: `${API_URL}/api/broadcasting/auth`,
      transport: 'ajax',
      headersProvider: () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }),
    },
  });

  return new Echo({ broadcaster: 'pusher', key: PUSHER_KEY, client });
}
```

(If `tsc` rejects the `client` option or `headersProvider` against the installed typings, check `node_modules/laravel-echo/dist/connector/pusher-connector.d.ts` and `node_modules/pusher-js/types/src/core/auth/options.d.ts` for the exact option names in the installed versions and adjust — the behaviour to preserve is: one Pusher client, authorizing at `/api/broadcasting/auth` with the Bearer token.)

`src/realtime/sortByPresence.ts`:

```ts
export function sortByPresence<T extends { id: number; name: string }>(users: T[], online: Set<number>): T[] {
  return [...users].sort((a, b) => {
    const presence = Number(online.has(b.id)) - Number(online.has(a.id));
    return presence !== 0 ? presence : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
```

`src/realtime/RealtimeProvider.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { queryKeys } from '@/api/queries';
import type { InvitationSentPayload, PlayerJoinedPayload } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { PUSHER_KEY } from '@/config';
import { createEcho, type EchoClient } from './echo';

interface PresenceMember {
  id: number;
  codename: string;
}

const RealtimeContext = createContext<{ echo: EchoClient | null; onlineUserIds: Set<number> }>({
  echo: null,
  onlineUserIds: new Set(),
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const token = state.status === 'signedIn' ? state.token : null;
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const queryClient = useQueryClient();
  const { showBanner } = useBanner();
  const [echo, setEcho] = useState<EchoClient | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !userId || !PUSHER_KEY) return;

    const instance = createEcho(token);
    setEcho(instance);

    instance
      .join('online-users')
      .here((members: PresenceMember[]) => setOnlineUserIds(new Set(members.map((m) => m.id))))
      .joining((member: PresenceMember) => setOnlineUserIds((prev) => new Set(prev).add(member.id)))
      .leaving((member: PresenceMember) =>
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        }),
      );

    instance.private(`user.${userId}`).listen('.invitation.sent', (payload: InvitationSentPayload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.spyHome });
      showBanner({
        message: `${payload.from_codename} invited you to ${payload.game_title}`,
        onPress: () => router.push({ pathname: '/spy', params: { highlight: String(payload.invitation_id) } }),
      });
    });

    // iOS drops sockets in the background anyway; push notifications cover
    // that gap. pusher-js resubscribes every channel on reconnect.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') instance.connector.pusher.connect();
      else if (status === 'background') instance.connector.pusher.disconnect();
    });

    return () => {
      subscription.remove();
      instance.disconnect();
      setEcho(null);
      setOnlineUserIds(new Set());
    };
    // showBanner and queryClient are stable; reconnect only when the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  return <RealtimeContext.Provider value={{ echo, onlineUserIds }}>{children}</RealtimeContext.Provider>;
}

export function useOnlineUserIds(): Set<number> {
  return useContext(RealtimeContext).onlineUserIds;
}

/** Subscribes to a game's channel while the calling screen is focused. */
export function useGameChannel(gameId: number | undefined, onPlayerJoined: (payload: PlayerJoinedPayload) => void) {
  const { echo } = useContext(RealtimeContext);
  const handler = useRef(onPlayerJoined);
  handler.current = onPlayerJoined;

  useFocusEffect(
    useCallback(() => {
      if (!echo || gameId === undefined) return;
      const name = `game.${gameId}`;
      echo.private(name).listen('.player.joined', (payload: PlayerJoinedPayload) => handler.current(payload));
      return () => echo.leave(name);
    }, [echo, gameId]),
  );
}
```

Add `RealtimeProvider` inside `BannerProvider` in both `app/_layout.tsx` and `tests/support/renderApp.tsx`:

```tsx
<BannerProvider>
  <RealtimeProvider>
    {/* <Slot /> in the app, {children} in the test wrapper */}
  </RealtimeProvider>
</BannerProvider>
```

- [ ] **Step 4: Write the lobby and invite screens**

`app/(app)/games/[code]/index.tsx`:

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Share, View } from 'react-native';
import { ApiError } from '@/api/errors';
import { useGame, useJoinGame, useRefreshOnFocus } from '@/api/queries';
import { useSignedInUser } from '@/auth/AuthProvider';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { OnlineDot } from '@/components/OnlineDot';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useGameChannel, useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { useTheme } from '@/theme/useTheme';

export default function Lobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const me = useSignedInUser();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const game = useGame(code);
  const joinGame = useJoinGame();
  useRefreshOnFocus(game.refetch);
  useGameChannel(game.data?.id, () => void game.refetch());

  if (game.error instanceof ApiError && game.error.status === 403) {
    return (
      <Screen testID="not-on-operation">
        <Stack.Screen options={{ title: code }} />
        <AppText variant="heading">You're not on this operation</AppText>
        <AppText variant="muted">Join with invite code {code} to see the roster.</AppText>
        <Button
          testID="btn-join-from-lobby"
          label="Join Operation"
          loading={joinGame.isPending}
          onPress={() =>
            joinGame.mutate(code, {
              onError: (error) =>
                showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Could not join.' }),
            })
          }
        />
      </Screen>
    );
  }

  const data = game.data;
  const isHost = data?.host_id === me.id;

  const share = () =>
    Share.share({
      message: `Join my SpyNet operation "${data?.title}" with invite code ${code}: spynet://join/${code}`,
    });

  return (
    <Screen refreshing={game.isRefetching} onRefresh={() => void game.refetch()}>
      <Stack.Screen options={{ title: data?.title ?? code }} />
      {game.error ? <FormError message={applyServerErrors(game.error, () => {}, [])} /> : null}
      <Card>
        <AppText variant="muted">Invite code</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText testID="lobby-code" variant="mono">{code}</AppText>
          <Button testID="btn-share" label="Share" variant="secondary" onPress={() => void share()} />
        </View>
        {data ? (
          <>
            <AppText variant="heading">{data.title}</AppText>
            <AppText variant="muted">
              {data.player_count} / {data.max_players} operatives · {data.game_mode} · {data.status}
            </AppText>
            <AppText>{data.mission_briefing}</AppText>
          </>
        ) : (
          <AppText variant="muted">Loading…</AppText>
        )}
        {isHost && data?.status === 'recruiting' ? (
          <Button testID="btn-invite-players" label="Invite Players" onPress={() => router.push(`/games/${code}/invite`)} />
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">Roster</AppText>
        {data?.players?.map((player) => (
          <View
            key={player.id}
            testID={`roster-${player.user.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <OnlineDot online={online.has(player.user.id)} />
            <AppText style={{ flex: 1 }}>{player.user.codename}</AppText>
            {player.is_host ? <Badge label="Host" /> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
```

`app/(app)/games/[code]/invite.tsx`:

```tsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useInvitableUsers, useInvite, useRefreshOnFocus } from '@/api/queries';
import { useBanner } from '@/banner/BannerProvider';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormError } from '@/components/FormError';
import { OnlineDot } from '@/components/OnlineDot';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';
import { useOnlineUserIds } from '@/realtime/RealtimeProvider';
import { sortByPresence } from '@/realtime/sortByPresence';
import { useTheme } from '@/theme/useTheme';

export default function InvitePlayers() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { spacing } = useTheme();
  const { showBanner } = useBanner();
  const online = useOnlineUserIds();
  const users = useInvitableUsers(code);
  const invite = useInvite(code);
  useRefreshOnFocus(users.refetch);

  const sorted = useMemo(() => sortByPresence(users.data ?? [], online), [users.data, online]);

  return (
    <Screen refreshing={users.isRefetching} onRefresh={() => void users.refetch()}>
      <Stack.Screen options={{ title: 'Invite Players' }} />
      {users.error ? <FormError message={applyServerErrors(users.error, () => {}, [])} /> : null}
      {sorted.length === 0 && !users.isLoading ? <EmptyState message="Everyone is already on this operation." /> : null}
      {sorted.map((user) => (
        <Card key={user.id} testID={`invitable-${user.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <OnlineDot online={online.has(user.id)} />
            <View style={{ flex: 1 }}>
              <AppText>{user.codename}</AppText>
              <AppText variant="muted">{user.name}</AppText>
            </View>
            {user.invite_status === 'pending' ? (
              <Badge label="Pending" tone="muted" />
            ) : (
              <Button
                testID={`btn-invite-${user.id}`}
                label="Invite"
                loading={invite.isPending && invite.variables === user.id}
                onPress={() =>
                  invite.mutate(user.id, {
                    onError: (error) =>
                      showBanner({ tone: 'error', message: applyServerErrors(error, () => {}, []) ?? 'Could not invite.' }),
                  })
                }
              />
            )}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
```

- [ ] **Step 5: Run the tests, then the full check**

Run: `npx jest tests/realtime tests/screens && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add presence, live invitation banners, the live lobby and the invite players screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Settings (profile, password, delete account, log out)

**Files:**
- Create: `app/(app)/settings/index.tsx`, `app/(app)/settings/profile.tsx`, `app/(app)/settings/password.tsx`, `app/(app)/settings/delete-account.tsx`
- Test: `tests/screens/settings.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (`logout`, `signOutLocally`, `setUser`), `useSignedInUser()`, `meApi.{update, updatePassword, destroy}`.
- Produces: routes `/settings`, `/settings/profile`, `/settings/password`, `/settings/delete-account`. testIDs `btn-logout`, `input-profile-name`, `input-profile-email`, `btn-save-profile`, `input-current-password`, `input-new-password`, `input-new-password-confirmation`, `btn-save-password`, `input-delete-password`, `btn-delete-account`.

- [ ] **Step 1: Write the failing test**

`tests/screens/settings.test.tsx`:

```tsx
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { authApi, meApi } from '@/api/endpoints';
import { ValidationError } from '@/api/errors';
import AppLayout from '../../app/(app)/_layout';
import DeleteAccount from '../../app/(app)/settings/delete-account';
import Settings from '../../app/(app)/settings/index';
import Password from '../../app/(app)/settings/password';
import Profile from '../../app/(app)/settings/profile';
import AuthLayout from '../../app/(auth)/_layout';
import { fakeUser } from '../support/fakes';
import { renderApp } from '../support/renderApp';

jest.mock('@/api/endpoints');

const routes = {
  '(auth)/_layout': AuthLayout,
  '(auth)/welcome': () => <Text>welcome</Text>,
  '(app)/_layout': AppLayout,
  '(app)/settings/index': Settings,
  '(app)/settings/profile': Profile,
  '(app)/settings/password': Password,
  '(app)/settings/delete-account': DeleteAccount,
};

test('log out returns to welcome', async () => {
  jest.mocked(authApi.logout).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/settings', user: fakeUser });

  await act(async () => {
    fireEvent.press(await screen.findByTestId('btn-logout'));
  });

  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('profile edits are saved and shown', async () => {
  jest.mocked(meApi.update).mockResolvedValue({ ...fakeUser, name: 'Ada L.' });
  await renderApp(routes, { initialUrl: '/settings/profile', user: fakeUser });

  expect(await screen.findByDisplayValue('ada@example.com')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('input-profile-name'), 'Ada L.');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-save-profile'));
  });

  expect(meApi.update).toHaveBeenCalledWith({ name: 'Ada L.', email: 'ada@example.com' });
  expect(await screen.findByText('Profile updated.')).toBeOnTheScreen();
});

test('a wrong current password is shown on its field', async () => {
  jest.mocked(meApi.updatePassword).mockRejectedValue(new ValidationError('x', { current_password: ['The password is incorrect.'] }));
  await renderApp(routes, { initialUrl: '/settings/password', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-current-password'), 'wrong');
  fireEvent.changeText(screen.getByTestId('input-new-password'), 'new-password');
  fireEvent.changeText(screen.getByTestId('input-new-password-confirmation'), 'new-password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-save-password'));
  });

  expect(await screen.findByText('The password is incorrect.')).toBeOnTheScreen();
});

test('deleting the account signs out to welcome', async () => {
  jest.mocked(meApi.destroy).mockResolvedValue(undefined);
  await renderApp(routes, { initialUrl: '/settings/delete-account', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-delete-password'), 'password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-delete-account'));
  });

  expect(meApi.destroy).toHaveBeenCalledWith('password');
  await waitFor(() => expect(screen).toHavePathname('/welcome'));
});

test('a wrong password does not delete the account', async () => {
  jest.mocked(meApi.destroy).mockRejectedValue(new ValidationError('x', { password: ['The password is incorrect.'] }));
  await renderApp(routes, { initialUrl: '/settings/delete-account', user: fakeUser });

  fireEvent.changeText(await screen.findByTestId('input-delete-password'), 'wrong');
  await act(async () => {
    fireEvent.press(screen.getByTestId('btn-delete-account'));
  });

  expect(await screen.findByText('The password is incorrect.')).toBeOnTheScreen();
  expect(screen).toHavePathname('/settings/delete-account');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/screens/settings.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the screens**

`app/(app)/settings/index.tsx`:

```tsx
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';

export default function Settings() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useSignedInUser();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Card>
        <AppText variant="heading">{user.codename}</AppText>
        <AppText variant="muted">{user.email}</AppText>
      </Card>
      <Button label="Profile" variant="secondary" onPress={() => router.push('/settings/profile')} />
      <Button label="Password" variant="secondary" onPress={() => router.push('/settings/password')} />
      <Button label="Delete account" variant="secondary" onPress={() => router.push('/settings/delete-account')} />
      <Button
        testID="btn-logout"
        label="Log out"
        loading={loggingOut}
        onPress={() => {
          setLoggingOut(true);
          void logout();
        }}
      />
    </Screen>
  );
}
```

`app/(app)/settings/profile.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth, useSignedInUser } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { name: string; email: string };

export default function Profile() {
  const user = useSignedInUser();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    defaultValues: { name: user.name, email: user.email ?? '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);
    setFormError(null);
    try {
      setUser(await meApi.update({ name: input.name.trim(), email: input.email.trim() }));
      setStatus('Profile updated.');
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['name', 'email']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Profile' }} />
      <FormTextField control={control} name="name" label="Name" testID="input-profile-name" />
      <FormTextField control={control} name="email" label="Email" testID="input-profile-email" autoCapitalize="none" keyboardType="email-address" />
      <FormError message={formError} />
      {status ? <AppText>{status}</AppText> : null}
      <Button testID="btn-save-profile" label="Save" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
```

`app/(app)/settings/password.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { current_password: string; password: string; password_confirmation: string };

export default function Password() {
  const [status, setStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, reset, formState } = useForm<Form>({
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setStatus(null);
    setFormError(null);
    try {
      await meApi.updatePassword(input);
      reset();
      setStatus('Password updated.');
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['current_password', 'password', 'password_confirmation']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Password' }} />
      <FormTextField control={control} name="current_password" label="Current password" testID="input-current-password" secureTextEntry autoComplete="current-password" />
      <FormTextField control={control} name="password" label="New password" testID="input-new-password" secureTextEntry autoComplete="new-password" />
      <FormTextField control={control} name="password_confirmation" label="Confirm new password" testID="input-new-password-confirmation" secureTextEntry autoComplete="new-password" />
      <FormError message={formError} />
      {status ? <AppText>{status}</AppText> : null}
      <Button testID="btn-save-password" label="Update password" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
```

`app/(app)/settings/delete-account.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { meApi } from '@/api/endpoints';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { FormTextField } from '@/components/FormTextField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { applyServerErrors } from '@/forms/applyServerErrors';

type Form = { password: string };

export default function DeleteAccount() {
  const { signOutLocally } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({ defaultValues: { password: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await meApi.destroy(password);
      await signOutLocally();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['password']));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <AppText variant="heading">Delete your account</AppText>
      <AppText variant="muted">
        This permanently deletes your account, your operations roster places and your invitations, on the web and on
        every device. It cannot be undone.
      </AppText>
      <FormTextField control={control} name="password" label="Confirm with your password" testID="input-delete-password" secureTextEntry />
      <FormError message={formError} />
      <Button testID="btn-delete-account" label="Delete account permanently" variant="destructive" loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}
```

- [ ] **Step 4: Run the test, then the full check**

Run: `npx jest tests/screens/settings.test.tsx && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add settings screens for profile, password, account deletion and log out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Push notifications (registration, foreground handling, tap navigation)

**Files:**
- Create: `src/notifications/registerForPush.ts`, `src/notifications/NotificationsProvider.tsx`
- Modify: `app/_layout.tsx` (add `NotificationsProvider` inside `RealtimeProvider`)
- Test: `tests/notifications/registerForPush.test.ts`

**Interfaces:**
- Consumes: `meApi.registerPushToken` (Task 2), `EAS_PROJECT_ID` (Task 1), `invitationHrefFrom` (Task 3), `useAuth()`; Plan A's push `data` `{ type: 'invitation', invitation_id, code }` and Android channel id `invitations`.
- Produces: `registerForPushNotifications(): Promise<string | null>`; `<NotificationsProvider>`.

- [ ] **Step 1: Write the failing test**

`tests/notifications/registerForPush.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { meApi } from '@/api/endpoints';
import { registerForPushNotifications } from '@/notifications/registerForPush';

let mockIsDevice = true;

jest.mock('@/api/endpoints');
jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() {
    return mockIsDevice;
  },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

beforeEach(() => {
  mockIsDevice = true;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[x]' });
});

test('registers the Expo token with the API when permission is granted', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);

  await expect(registerForPushNotifications()).resolves.toBe('ExponentPushToken[x]');

  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project' });
  expect(meApi.registerPushToken).toHaveBeenCalledWith('ExponentPushToken[x]', Platform.OS === 'ios' ? 'ios' : 'android');
});

test('asks for permission when undetermined and stops if denied', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: 'undetermined' } as never);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);

  await expect(registerForPushNotifications()).resolves.toBeNull();

  expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  expect(meApi.registerPushToken).not.toHaveBeenCalled();
});

test('does nothing on a simulator', async () => {
  mockIsDevice = false;

  await expect(registerForPushNotifications()).resolves.toBeNull();

  expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/notifications`
Expected: FAIL — `Cannot find module '@/notifications/registerForPush'`.

- [ ] **Step 3: Write registration and the provider**

`src/notifications/registerForPush.ts`:

```ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { meApi } from '@/api/endpoints';
import { EAS_PROJECT_ID } from '@/config';

/**
 * Asks for permission (the OS only prompts once) and registers this device's
 * Expo push token with the API. Returns null when push isn't available:
 * simulator, no EAS project id, or permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice || !EAS_PROJECT_ID) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('invitations', {
      name: 'Invitations',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  await meApi.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  return token;
}
```

`src/notifications/NotificationsProvider.tsx`:

```tsx
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { invitationHrefFrom } from '@/linking';
import { registerForPushNotifications } from './registerForPush';

// While the app is open, the realtime banner already announces invitations,
// so the OS banner is suppressed (the notification still lands in the list).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (userId === null) return;
    registerForPushNotifications().catch(() => {
      // Push is best-effort; the app works without it.
    });
  }, [userId]);

  // Covers both a tap while running and a tap that cold-started the app.
  useEffect(() => {
    if (!lastResponse || userId === null) return;
    const href = invitationHrefFrom(lastResponse.notification.request.content.data);
    if (href) router.push(href);
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse, userId]);

  return <>{children}</>;
}
```

In `app/_layout.tsx`, import `NotificationsProvider` and wrap `<Slot />`:

```tsx
<RealtimeProvider>
  <NotificationsProvider>
    <Slot />
  </NotificationsProvider>
</RealtimeProvider>
```

(If the installed `expo-notifications` typings name the handler fields differently, match them — the behaviour to keep is: no OS banner or sound in the foreground, still listed in the notification centre.)

- [ ] **Step 4: Run the test, then the full check**

Run: `npx jest tests/notifications && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd .. && git add expo-app && git commit -m "Register for push notifications and open invitations from notification taps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Maestro E2E flows, release guide, and README

**Files:**
- Create: `expo-app/.maestro/01_register_and_create.yaml`, `expo-app/.maestro/02_join_and_invite.yaml`
- Create: `expo-app/RELEASE.md`, `expo-app/README.md` (replace the template's, if any)
- Modify: root `README.md` is **not** touched (it has the user's own uncommitted edits)

- [ ] **Step 1: Write the Maestro flows**

`.maestro/01_register_and_create.yaml`:

```yaml
# Requires a dev build installed on a simulator/emulator and laravel-app
# reachable at EXPO_PUBLIC_API_URL. Run: maestro test .maestro/01_register_and_create.yaml
appId: com.example.spynet
---
- launchApp:
    clearState: true
- tapOn:
    id: btn-welcome-register
- tapOn:
    id: input-name
- inputText: Maestro Host
- tapOn:
    id: input-email
- inputRandomEmail
- tapOn:
    id: input-password
- inputText: password
- tapOn:
    id: input-password-confirmation
- inputText: password
- tapOn:
    id: btn-register
- assertVisible: Choose a Game
- tapOn:
    id: tile-spy
- tapOn:
    id: btn-open-create
- tapOn:
    id: input-game-title
- inputText: Operation Maestro
- tapOn:
    id: input-mission-briefing
- inputText: Find the mole.
- tapOn:
    id: btn-create-game
- assertVisible:
    id: lobby-code
- assertVisible: Roster
```

`.maestro/02_join_and_invite.yaml`:

```yaml
# Second account joins the operation created by flow 01 by its code.
# Run with the code shown in flow 01's lobby:
#   maestro test -e CODE=SPY-XXXX .maestro/02_join_and_invite.yaml
appId: com.example.spynet
---
- launchApp:
    clearState: true
- tapOn:
    id: btn-welcome-register
- tapOn:
    id: input-name
- inputText: Maestro Agent
- tapOn:
    id: input-email
- inputRandomEmail
- tapOn:
    id: input-password
- inputText: password
- tapOn:
    id: input-password-confirmation
- inputText: password
- tapOn:
    id: btn-register
- openLink: spynet://join/${CODE}
- assertVisible: Join operation ${CODE}?
- tapOn:
    id: btn-join-game
- assertVisible:
    id: lobby-code
- assertVisible: Roster
```

- [ ] **Step 2: Write `RELEASE.md`**

`expo-app/RELEASE.md`:

````markdown
# Releasing SpyNet Mobile

## One-time setup

1. Install the CLI and log in: `npm install -g eas-cli && eas login`.
2. Link the project: `eas init` (writes the project id; set it as `EAS_PROJECT_ID`
   in `.env` for local builds).
3. Replace the placeholders in `app.config.ts`:
   - `ios.bundleIdentifier` and `android.package` (currently `com.example.spynet`)
   - `icon`, adaptive icon and splash images in `assets/`
   - Update `appId` in `.maestro/*.yaml` to match.
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
- [ ] Sharing an invite from the lobby and opening `spynet://join/<code>` on
      another device pre-fills Join Operation.
- [ ] Log in with a 2FA-enabled account (code and recovery code).
- [ ] Delete account works and the account can no longer log in (web or app).
- [ ] Store listings: privacy policy URL, screenshots, description, and the
      App Store "account deletion" answer pointing at Settings → Delete account.
````

- [ ] **Step 3: Write `README.md`**

`expo-app/README.md`:

````markdown
# SpyNet Mobile (Expo)

iOS/Android client for the SpyNet platform. Talks to `../laravel-app`'s
`/api/v1` JSON API (see that README's "Mobile API" section).

## Develop

```bash
export PATH=~/.nvm/versions/node/v24.13.0/bin:$PATH
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
````

- [ ] **Step 4: Final verification**

Run from `expo-app/`: `npm test && npx expo config --type public > /dev/null && npx expo export --platform ios --output-dir /tmp/spynet-export-check`
Expected: tests pass; config resolves; the JS bundle exports without errors (proves every route and import resolves under Metro, which Jest does not). Delete `/tmp/spynet-export-check` afterwards.

Then from `laravel-app/`: `php artisan test` — expected PASS (Plan A unaffected).

- [ ] **Step 5: Commit**

```bash
cd .. && git add expo-app && git commit -m "Add Maestro flows, the release guide and the mobile app README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
