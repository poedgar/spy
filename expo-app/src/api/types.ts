export type Locale = 'en' | 'uk';

export interface User {
  id: number;
  name: string;
  codename: string;
  email?: string;
  /** Only present on the signed-in user's own record. */
  locale?: Locale;
  email_notifications?: boolean;
  email_verified?: boolean;
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
  ends_at: string | null;
  voting_started_at: string | null;
  ended_at: string | null;
  my_role: 'spy' | 'loyalist' | null;
  location: Place | null;
  voted_user_ids: number[];
  my_vote: number | null;
  result: RoundResult | null;
}

export type GameType = 'spy' | 'phrase';

export interface HistoryEntry {
  number: number;
  ending: string;
  ended_at: string | null;
  // Spy rounds
  winning_team?: Team | null;
  location?: Place | null;
  spy_user_ids?: number[];
  // Phrase deals
  phrase?: string;
  winner_user_id?: number | null;
}

/** The signed-in player's view of a Phrase deal: only their own word, until it ends. */
export interface PhraseRound {
  number: number;
  language: Locale;
  word_count: number;
  started_at: string;
  ends_at: string | null;
  ended_at: string | null;
  my_word: string | null;
  my_position: number | null;
  question_round: number;
  asker_user_id: number | null;
  turn_order: number[];
  scoring: { win: number; wrong_guess: number };
  guesses: { user_id: number; guess: string; correct: boolean }[];
  result: {
    ending: 'guessed' | 'revealed' | 'time_up' | 'abandoned';
    winner_user_id: number | null;
    phrase: string;
    words: { position: number; word: string; user_id: number | null }[];
  } | null;
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
  game_type: GameType;
  game_mode: GameMode | null;
  age_tier?: AgeTier;
  phrase_language?: Locale | null;
  max_allowed_players?: number;
  max_players: number;
  min_players?: number;
  mission_briefing: string;
  status: GameStatus;
  host_id: number;
  requires_approval?: boolean;
  is_listed?: boolean;
  player_count: number;
  spy_count?: number;
  created_at: string | null;
  host?: User;
  players?: Player[];
  round?: Round | null;
  phrase?: PhraseRound | null;
  /** Seconds per round, or null for no timer. */
  round_seconds?: number | null;
  /** Earlier rounds, newest first (the one on show is left out). */
  history?: HistoryEntry[];
  /** Host only: players waiting to be let in. */
  join_requests?: { id: number; user: User; created_at: string | null }[];
  /** Host only: invitations not (yet) accepted. */
  invitations?: { id: number; status: 'pending' | 'declined'; user: User; updated_at: string | null }[];
}

/** A code join in a game whose host approves new players. */
export interface JoinRequested {
  status: 'requested';
  code: string;
  title: string;
  game_type: GameType;
}

export function isJoinRequested(result: Game | JoinRequested): result is JoinRequested {
  return 'status' in result && result.status === 'requested';
}

export interface JoinAnsweredPayload {
  approved: boolean;
  game_code: string;
  game_title: string;
  game_type: GameType;
}

export interface Invitation {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  game_type?: GameType;
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

/** A game looking for players, as listed to someone not in it. */
export interface OpenGame {
  id: number;
  code: string;
  title: string;
  game_type: GameType;
  game_mode: GameMode | null;
  age_tier: AgeTier;
  phrase_language: Locale | null;
  player_count: number;
  max_players: number;
  host_codename: string;
  my_request: 'pending' | 'accepted' | 'declined' | null;
}

export interface SpyHome {
  games: Game[];
  pending_invitations: Invitation[];
  open_games?: OpenGame[];
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
  round_seconds?: number;
  game_mode: GameMode;
  age_tier: AgeTier;
  max_players: number;
  mission_briefing: string;
}

export interface PlayerJoinedPayload {
  player: Player;
  player_count: number;
}

export interface CreatePhraseGameInput {
  title: string;
  round_seconds?: number;
  phrase_language: Locale;
  max_players: number;
}

export interface InvitationSentPayload {
  invitation_id: number;
  game_type?: GameType;
  game_title: string;
  game_code: string;
  from_codename: string;
}

export type NotificationKind = 'invitation' | 'join_request' | 'join_answered' | 'round_started' | 'removed' | 'became_host';

/** A notification as the server presents it, in the reader's language. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** The web path it points at: /games/spy, /games/phrase or /games/SPY-XXXX. */
  link: string;
  game_code: string | null;
  game_type: GameType | null;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationFeed {
  unread_count: number;
  notifications: AppNotification[];
}
