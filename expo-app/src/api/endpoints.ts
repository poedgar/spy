import { request } from './client';
import type {
  AuthResult,
  CreateGameInput,
  Game,
  AgeTier,
  InvitableUser,
  Invitation,
  Locale,
  LocationGuide,
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
  updateLocale: (locale: Locale) => request<User>('PUT', '/me/locale', { locale }),
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
  leave: (code: string) => request<void>('POST', `/games/${enc(code)}/leave`),
  toggleReady: (code: string) => request<Game>('POST', `/games/${enc(code)}/ready`),
  startRound: (code: string) => request<Game>('POST', `/games/${enc(code)}/start`),
  startVoting: (code: string) => request<Game>('POST', `/games/${enc(code)}/voting`),
  vote: (code: string, suspectId: number) => request<Game>('POST', `/games/${enc(code)}/votes`, { suspect_id: suspectId }),
  tally: (code: string) => request<Game>('POST', `/games/${enc(code)}/tally`),
  guess: (code: string, locationId: number) =>
    request<{ correct: boolean; game: Game }>('POST', `/games/${enc(code)}/guess`, { location_id: locationId }),
  reset: (code: string) => request<Game>('POST', `/games/${enc(code)}/reset`),
  locations: (tier: AgeTier) => request<LocationGuide>('GET', `/locations?tier=${tier}`),
  invitableUsers: (code: string) => request<InvitableUser[]>('GET', `/games/${enc(code)}/invitable-users`),
  invite: (code: string, toUserId: number) =>
    request<Invitation>('POST', `/games/${enc(code)}/invitations`, { to_user_id: toUserId }),
  accept: (invitationId: number) => request<Game>('POST', `/invitations/${invitationId}/accept`),
  decline: (invitationId: number) => request<void>('POST', `/invitations/${invitationId}/decline`),
};
