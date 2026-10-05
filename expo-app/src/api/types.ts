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
