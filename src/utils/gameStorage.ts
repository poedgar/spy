import { SpyGame, AuthUser, GameMode } from '../types.ts';
import { SPY_LOCATIONS, getRandomLocation } from '../data/locations.ts';

const STORAGE_KEY = 'spynet_active_games';

/**
 * Calculates the number of spies based on the participant count:
 * - 3 to 4 players: 1 Spy
 * - 5 to 7 players: 2 Spies
 * - 8 to 10 players: 3 Spies
 * - and so on (+1 spy every 3 additional players)
 */
export function getSpyCount(playerCount: number): number {
  if (playerCount < 3) return 1;
  if (playerCount < 5) return 1;
  if (playerCount < 8) return 2;
  return 1 + Math.floor((playerCount - 2) / 3);
}

export function getStoredGames(): SpyGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse stored games:', err);
    return [];
  }
}

export function saveStoredGames(games: SpyGame[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    window.dispatchEvent(new Event('spy_games_updated'));
  } catch (err) {
    console.error('Failed to save games to localStorage:', err);
  }
}

export function getGameById(id: string): SpyGame | undefined {
  const games = getStoredGames();
  return games.find((g) => g.id.toLowerCase() === id.toLowerCase() || g.inviteCode.toLowerCase() === id.toLowerCase());
}

export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SPY-${code}`;
}

export function generateInviteLink(gameId: string): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?game=${encodeURIComponent(gameId)}`;
}

export function createNewSpyGame(
  user: AuthUser,
  title: string,
  gameMode: GameMode,
  maxPlayers: number,
  secretLocation: string,
  missionBriefing: string
): SpyGame {
  const id = generateGameId();
  const newGame: SpyGame = {
    id,
    title: title.trim() || `Operation ${id}`,
    gameMode,
    hostUsername: user.username,
    hostCodename: user.codename,
    createdAt: new Date().toISOString(),
    maxPlayers,
    secretLocation: secretLocation.trim() || 'Classified Embassy - Sector 7',
    missionBriefing: missionBriefing.trim() || 'Infiltrate the secure perimeter. Identify the rogue operative before time expires.',
    status: 'recruiting',
    inviteCode: id,
    players: [
      {
        username: user.username,
        codename: user.codename,
        clearanceLevel: user.clearanceLevel,
        isHost: true,
        status: 'ready',
        joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: 0,
      },
    ],
  };

  const games = getStoredGames();
  // prepend new game
  saveStoredGames([newGame, ...games.filter((g) => g.id !== id)]);
  return newGame;
}

export function joinSpyGame(gameId: string, user: AuthUser): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase() || g.inviteCode.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  const alreadyIn = game.players.some((p) => p.username.toLowerCase() === user.username.toLowerCase());

  if (!alreadyIn) {
    if (game.players.length >= game.maxPlayers) {
      throw new Error('This operation roster is already full.');
    }
    game.players.push({
      username: user.username,
      codename: user.codename,
      clearanceLevel: user.clearanceLevel,
      isHost: false,
      status: 'ready',
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: 0,
    });
    games[gameIndex] = game;
    saveStoredGames(games);
  }

  return game;
}

export function addBotOperative(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (game.players.length >= game.maxPlayers) return null;

  const botCodenames = ['BLACK_LOTUS', 'SILENT_ECHO', 'VECTOR_ZERO', 'NEON_SNAKE', 'PHANTOM_KEY'];
  const available = botCodenames.filter((cn) => !game.players.some((p) => p.codename === cn));
  const chosenCodename = available[0] || `AGENT_${Math.floor(100 + Math.random() * 900)}`;

  game.players.push({
    username: chosenCodename.toLowerCase(),
    codename: chosenCodename,
    clearanceLevel: 'LEVEL 3 - SECRET',
    isHost: false,
    status: 'ready',
    joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: 0,
  });

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function togglePlayerReady(gameId: string, username: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  game.players = game.players.map((p) => {
    if (p.username.toLowerCase() === username.toLowerCase()) {
      return { ...p, status: p.status === 'ready' ? 'pending' : 'ready' };
    }
    return p;
  });

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function startSpyGame(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (game.players.length < 3) {
    throw new Error('At least 3 participants are required to start the game.');
  }

  // 1. Pick a random location from the 500 pre-existing locations
  const randomLocation = getRandomLocation();

  // 2. Calculate the number of spies required:
  // 3-4 players: 1 spy; 5-7 players: 2 spies; 8-10 players: 3 spies; etc.
  const spyCount = getSpyCount(game.players.length);

  // 3. Randomly shuffle players to pick spies
  const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
  const spyUsernames = shuffledPlayers.slice(0, spyCount).map((p) => p.username.toLowerCase());

  game.status = 'active';
  game.selectedLocation = randomLocation;
  game.secretLocation = randomLocation;
  game.spyUsernames = spyUsernames;
  game.totalSpiesCount = spyCount;
  game.startedAt = new Date().toISOString();

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function startVotingPhase(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  game.status = 'voting';
  game.votes = {};
  game.votingResults = undefined;

  // Automatically generate votes for bot agents (bots vote for another player)
  const isBot = (username: string) =>
    username.startsWith('agent_') ||
    ['black_lotus', 'silent_echo', 'vector_zero', 'neon_snake', 'phantom_key'].includes(username.toLowerCase());

  game.players.forEach((player) => {
    if (isBot(player.username)) {
      const candidates = game.players.filter(
        (p) => p.username.toLowerCase() !== player.username.toLowerCase()
      );
      if (candidates.length > 0) {
        const randomTarget = candidates[Math.floor(Math.random() * candidates.length)];
        game.votes![player.username.toLowerCase()] = randomTarget.username.toLowerCase();
      }
    }
  });

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function castVote(
  gameId: string,
  voterUsername: string,
  suspectUsername: string
): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (!game.votes) game.votes = {};

  game.votes[voterUsername.toLowerCase()] = suspectUsername.toLowerCase();

  // Ensure all bot players have also voted
  const isBot = (username: string) =>
    username.startsWith('agent_') ||
    ['black_lotus', 'silent_echo', 'vector_zero', 'neon_snake', 'phantom_key'].includes(username.toLowerCase());

  game.players.forEach((player) => {
    if (isBot(player.username) && !game.votes![player.username.toLowerCase()]) {
      const candidates = game.players.filter(
        (p) => p.username.toLowerCase() !== player.username.toLowerCase()
      );
      if (candidates.length > 0) {
        const randomTarget = candidates[Math.floor(Math.random() * candidates.length)];
        game.votes![player.username.toLowerCase()] = randomTarget.username.toLowerCase();
      }
    }
  });

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function tallyVotesAndConclude(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (!game.votes) game.votes = {};

  // Ensure all players have voted (if anyone missed, assign random candidate)
  game.players.forEach((player) => {
    const pUser = player.username.toLowerCase();
    if (!game.votes![pUser]) {
      const candidates = game.players.filter(
        (p) => p.username.toLowerCase() !== pUser
      );
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        game.votes![pUser] = pick.username.toLowerCase();
      }
    }
  });

  // Calculate vote counts per suspect
  const voteCounts: Record<string, number> = {};
  game.players.forEach((p) => {
    voteCounts[p.username.toLowerCase()] = 0;
  });

  Object.values(game.votes).forEach((suspect) => {
    const s = suspect.toLowerCase();
    voteCounts[s] = (voteCounts[s] || 0) + 1;
  });

  // Sort candidates by votes received descending
  const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
  const declaredSpyUsername = sorted.length > 0 ? sorted[0][0] : game.players[0].username.toLowerCase();

  // Check if declared player is really a Spy
  const normalizedSpies = (game.spyUsernames || []).map((u) => u.toLowerCase());
  const isRealSpy = normalizedSpies.includes(declaredSpyUsername.toLowerCase());

  let winningTeam: 'spies' | 'loyalists';
  let pointsAwardedUsernames: string[] = [];

  if (!isRealSpy) {
    // If he was not really Spy: real Spy or Spies win getting one point each
    winningTeam = 'spies';
    pointsAwardedUsernames = [...normalizedSpies];
  } else {
    // Otherwise: not Spies win getting one point each, too
    winningTeam = 'loyalists';
    pointsAwardedUsernames = game.players
      .filter((p) => !normalizedSpies.includes(p.username.toLowerCase()))
      .map((p) => p.username.toLowerCase());
  }

  // Award 1 point to each winner, preserving previous scores
  game.players = game.players.map((p) => {
    const isWinner = pointsAwardedUsernames.includes(p.username.toLowerCase());
    return {
      ...p,
      score: (p.score ?? 0) + (isWinner ? 1 : 0),
    };
  });

  game.status = 'completed';
  game.votingResults = {
    declaredSpyUsername,
    voteCounts,
    isRealSpy,
    winningTeam,
    pointsAwardedUsernames,
    totalVotesCast: Object.keys(game.votes).length,
  };

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function startNewRound(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];

  // Pick a fresh random location from the 500 locations pool
  const randomLocation = getRandomLocation();
  const spyCount = getSpyCount(game.players.length);

  // Shuffle and assign new spies
  const shuffledPlayers = [...game.players].sort(() => Math.random() - 0.5);
  const spyUsernames = shuffledPlayers.slice(0, spyCount).map((p) => p.username.toLowerCase());

  game.status = 'active';
  game.selectedLocation = randomLocation;
  game.secretLocation = randomLocation;
  game.spyUsernames = spyUsernames;
  game.totalSpiesCount = spyCount;
  game.startedAt = new Date().toISOString();
  game.votes = {};
  game.votingResults = undefined;

  // Keep existing player scores intact
  game.players = game.players.map((p) => ({
    ...p,
    score: p.score ?? 0,
  }));

  games[gameIndex] = game;
  saveStoredGames(games);
  return game;
}

export function updateGameStatus(
  gameId: string,
  status: 'recruiting' | 'active' | 'voting' | 'completed'
): SpyGame | null {
  if (status === 'active') {
    return startSpyGame(gameId);
  }
  if (status === 'voting') {
    return startVotingPhase(gameId);
  }
  if (status === 'completed') {
    return tallyVotesAndConclude(gameId);
  }

  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id === gameId);
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  game.status = status;
  if (status === 'recruiting') {
    // Reset secret assignments when returning to lobby, but keep scores
    game.selectedLocation = undefined;
    game.spyUsernames = undefined;
    game.totalSpiesCount = undefined;
    game.startedAt = undefined;
    game.votes = {};
    game.votingResults = undefined;
  }

  games[gameIndex] = game;
  saveStoredGames(games);
  return games[gameIndex];
}
