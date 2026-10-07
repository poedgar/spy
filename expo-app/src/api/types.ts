export type Locale = 'en' | 'uk';

export interface User {
  id: number;
  name: string;
  codename: string;
  email?: string;
  /** Only present on the signed-in user's own record. */
  locale?: Locale;
}

export interface Player {
  id: number;
  user: User;
  is_host: boolean;
  status: 'ready' | 'pending';
  score?: number;
  joined_at: string | null;
}

export type GameMode = 'mole' | 'codebreaker' | 'counterintel';
export type AgeTier = 'children' | 'teens' | 'adults';
export type GameStatus = 'recruiting' | 'active' | 'voting' | 'completed';
export type Team = 'spies' | 'loyalists';

/** A location, carried in both languages so either can be shown. */
export interface Place {
  id: number;
  en: string;
  uk: string;
  category: string;
}

export interface RoundResult {
  ending: 'vote' | 'spy_guess' | 'abandoned';
  winning_team: Team | null;
  spy_user_ids: number[];
  accused_user_id: number | null;
  guessed_by_user_id: number | null;
  guessed_location: Place | null;
  votes: { voter_id: number; suspect_id: number }[];
  vote_counts: Record<string, number>;
}

/** The signed-in player's view of a round: their own role only, until it ends. */
export interface Round {
  number: number;
  spy_count: number;
  started_at: string;
  voting_started_at: string | null;
  ended_at: string | null;
  my_role: 'spy' | 'loyalist' | null;
  location: Place | null;
  voted_user_ids: number[];
  my_vote: number | null;
  result: RoundResult | null;
}

export interface LocationGuide {
  tier: AgeTier;
  categories: Record<string, { en: string; uk: string }>;
  locations: Place[];
}

export interface Game {
  id: number;
  code: string;
  title: string;
  game_type: string;
  game_mode: GameMode;
  age_tier?: AgeTier;
  max_players: number;
  min_players?: number;
  mission_briefing: string;
  status: GameStatus;
  host_id: number;
  player_count: number;
  spy_count?: number;
  created_at: string | null;
  host?: User;
  players?: Player[];
  round?: Round | null;
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
  age_tier: AgeTier;
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
