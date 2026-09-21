export interface AuthUser {
  username: string;
  clearanceLevel: string;
  codename: string;
  terminalId: string;
  loginTime: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  error: string | null;
  isLoading: boolean;
}

export type GameMode = 'mole' | 'codebreaker' | 'counterintel';

export interface Operative {
  username: string;
  codename: string;
  clearanceLevel: string;
  isHost: boolean;
  status: 'ready' | 'pending';
  joinedAt: string;
  score?: number;
}

export interface VotingResults {
  declaredSpyUsername: string;
  voteCounts: Record<string, number>;
  isRealSpy: boolean;
  winningTeam: 'spies' | 'loyalists';
  pointsAwardedUsernames: string[];
  totalVotesCast: number;
}

export interface SpyGame {
  id: string;
  title: string;
  gameMode: GameMode;
  hostUsername: string;
  hostCodename: string;
  createdAt: string;
  maxPlayers: number;
  missionBriefing: string;
  secretLocation: string;
  selectedLocation?: string;
  spyUsernames?: string[];
  totalSpiesCount?: number;
  startedAt?: string;
  status: 'recruiting' | 'active' | 'voting' | 'completed';
  players: Operative[];
  inviteCode: string;
  votes?: Record<string, string>; // voterUsername -> suspectUsername
  votingResults?: VotingResults;
}
