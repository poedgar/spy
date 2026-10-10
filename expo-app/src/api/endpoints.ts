import { request } from './client';
import type {
  ChatMessage,
  AgeTier,
  AuthResult,
  CreateGameInput,
  CreatePhraseGameInput,
  Game,
  InvitableUser,
  Invitation,
  JoinRequested,
  Locale,
  LocationGuide,
  NotificationFeed,
  RegisterInput,
  SpyHome,
  TokenResult,
  User,
  VoiceAccess,
  VoiceParticipant,
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
  update: (input: { name: string; email: string; codename?: string; email_notifications?: boolean }) =>
    request<User>('PATCH', '/me', input),
  resendVerification: () => request<void>('POST', '/me/email/verification-notification'),
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
  join: (code: string) => request<Game | JoinRequested>('POST', `/games/${enc(code)}/join`),
  requestToJoin: (code: string) => request<JoinRequested>('POST', `/games/${enc(code)}/join-requests`),
  cancelJoinRequest: (code: string) => request<void>('DELETE', `/games/${enc(code)}/join-requests/mine`),
  updateSettings: (code: string, settings: { requires_approval?: boolean; is_listed?: boolean }) =>
    request<Game>('POST', `/games/${enc(code)}/settings`, settings),
  removePlayer: (code: string, userId: number) => request<Game>('DELETE', `/games/${enc(code)}/players/${userId}`),
  transferHost: (code: string, userId: number) => request<Game>('POST', `/games/${enc(code)}/host`, { user_id: userId }),
  answerJoinRequest: (code: string, requestId: number, approve: boolean) =>
    request<Game>('POST', `/games/${enc(code)}/join-requests/${requestId}/${approve ? 'approve' : 'decline'}`),
  cancelInvitation: (code: string, invitationId: number) =>
    request<Game>('DELETE', `/games/${enc(code)}/invitations/${invitationId}`),
  leave: (code: string) => request<void>('POST', `/games/${enc(code)}/leave`),
  toggleReady: (code: string) => request<Game>('POST', `/games/${enc(code)}/ready`),
  startRound: (code: string) => request<Game>('POST', `/games/${enc(code)}/start`),
  startVoting: (code: string) => request<Game>('POST', `/games/${enc(code)}/voting`),
  vote: (code: string, suspectId: number) => request<Game>('POST', `/games/${enc(code)}/votes`, { suspect_id: suspectId }),
  tally: (code: string) => request<Game>('POST', `/games/${enc(code)}/tally`),
  guess: (code: string, locationId: number) =>
    request<{ correct: boolean; game: Game }>('POST', `/games/${enc(code)}/guess`, { location_id: locationId }),
  reset: (code: string) => request<Game>('POST', `/games/${enc(code)}/reset`),
  phraseHome: () => request<SpyHome>('GET', '/games/phrase'),
  createPhrase: (input: CreatePhraseGameInput) => request<Game>('POST', '/games/phrase', input),
  startPhrase: (code: string) => request<Game>('POST', `/games/${enc(code)}/phrase/start`),
  passTurn: (code: string) => request<Game>('POST', `/games/${enc(code)}/phrase/turn`),
  revealPhrase: (code: string) => request<Game>('POST', `/games/${enc(code)}/phrase/reveal`),
  close: (code: string) => request<void>('DELETE', `/games/${enc(code)}`),
  guessPhrase: (code: string, guess: string) =>
    request<{ correct: boolean; game: Game }>('POST', `/games/${enc(code)}/phrase/guess`, { guess }),
  locations: (tier: AgeTier) => request<LocationGuide>('GET', `/locations?tier=${tier}`),
  invitableUsers: (code: string, search = '') =>
    request<InvitableUser[]>('GET', `/games/${enc(code)}/invitable-users${search ? `?q=${enc(search)}` : ''}`),
  /** Who is in the game's voice room, seen without joining it. */
  voiceParticipants: (code: string) => request<VoiceParticipant[]>('GET', `/games/${enc(code)}/voice/participants`),
  messages: (code: string) => request<ChatMessage[]>('GET', `/games/${enc(code)}/messages`),
  postMessage: (code: string, body: string) => request<ChatMessage>('POST', `/games/${enc(code)}/messages`, { body }),
  /** What the app needs to join the game's LiveKit voice room. */
  voice: (code: string) => request<VoiceAccess>('GET', `/games/${enc(code)}/voice`),
  invite: (code: string, toUserId: number) =>
    request<Invitation>('POST', `/games/${enc(code)}/invitations`, { to_user_id: toUserId }),
  accept: (invitationId: number) => request<Game>('POST', `/invitations/${invitationId}/accept`),
  decline: (invitationId: number) => request<void>('POST', `/invitations/${invitationId}/decline`),
};

export const notificationsApi = {
  list: () => request<NotificationFeed>('GET', '/notifications'),
  read: (id: string) => request<void>('POST', `/notifications/${enc(id)}/read`),
  readAll: () => request<void>('POST', '/notifications/read-all'),
};
