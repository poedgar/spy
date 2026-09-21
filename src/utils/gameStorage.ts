import { SpyGame, AuthUser, GameMode } from '../types.ts';
import { getRandomLocation } from '../data/locations.ts';
import { db } from './firebase.ts';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

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

export function parseFirestoreGame(data: any): SpyGame {
  return {
    id: data.id,
    title: data.title || `Operation ${data.id}`,
    gameMode: data.gameMode || 'mole',
    hostUsername: data.hostUsername || '',
    hostCodename: data.hostCodename || data.hostUsername || 'COMMANDER',
    createdAt: data.createdAt || new Date().toISOString(),
    maxPlayers: Number(data.maxPlayers) || 6,
    secretLocation: data.secretLocation || '',
    selectedLocation: data.selectedLocation || undefined,
    missionBriefing: data.missionBriefing || '',
    status: data.status || 'recruiting',
    inviteCode: data.inviteCode || data.id,
    players: Array.isArray(data.players)
      ? data.players.map((p: any) => ({
          username: p.username || '',
          codename: p.codename || p.username || 'AGENT',
          clearanceLevel: p.clearanceLevel || 'LEVEL 3 - SECRET',
          isHost: Boolean(p.isHost),
          status: p.status === 'ready' ? 'ready' : 'pending',
          joinedAt: p.joinedAt || '00:00',
          score: Number(p.score) || 0,
        }))
      : [],
    spyUsernames: Array.isArray(data.spyUsernames) ? data.spyUsernames : undefined,
    totalSpiesCount: typeof data.totalSpiesCount === 'number' ? data.totalSpiesCount : undefined,
    startedAt: data.startedAt || undefined,
    votes: typeof data.votes === 'object' && data.votes !== null ? data.votes : {},
    votingResults: data.votingResults
      ? {
          declaredSpyUsername: data.votingResults.declaredSpyUsername || '',
          voteCounts: data.votingResults.voteCounts || {},
          isRealSpy: Boolean(data.votingResults.isRealSpy),
          winningTeam: data.votingResults.winningTeam === 'spies' ? 'spies' : 'loyalists',
          pointsAwardedUsernames: Array.isArray(data.votingResults.pointsAwardedUsernames)
            ? data.votingResults.pointsAwardedUsernames
            : [],
          totalVotesCast: Number(data.votingResults.totalVotesCast) || 0,
        }
      : undefined,
  };
}

export function sanitizeGameForFirestore(game: SpyGame): Record<string, any> {
  const clean: Record<string, any> = {
    id: game.id,
    title: game.title || `Operation ${game.id}`,
    gameMode: game.gameMode || 'mole',
    hostUsername: game.hostUsername || '',
    hostCodename: game.hostCodename || '',
    createdAt: game.createdAt || new Date().toISOString(),
    maxPlayers: Number(game.maxPlayers) || 6,
    secretLocation: game.secretLocation || '',
    missionBriefing: game.missionBriefing || '',
    status: game.status || 'recruiting',
    inviteCode: game.inviteCode || game.id,
    players: (game.players || []).map((p) => ({
      username: p.username || '',
      codename: p.codename || '',
      clearanceLevel: p.clearanceLevel || 'LEVEL 3 - SECRET',
      isHost: Boolean(p.isHost),
      status: p.status || 'ready',
      joinedAt: p.joinedAt || '00:00',
      score: Number(p.score) || 0,
    })),
    votes: game.votes ? { ...game.votes } : {},
  };

  if (game.selectedLocation !== undefined && game.selectedLocation !== null) {
    clean.selectedLocation = game.selectedLocation;
  }
  if (Array.isArray(game.spyUsernames)) {
    clean.spyUsernames = [...game.spyUsernames];
  }
  if (typeof game.totalSpiesCount === 'number') {
    clean.totalSpiesCount = game.totalSpiesCount;
  }
  if (game.startedAt !== undefined && game.startedAt !== null) {
    clean.startedAt = game.startedAt;
  }

  if (game.votingResults !== undefined && game.votingResults !== null) {
    clean.votingResults = {
      declaredSpyUsername: game.votingResults.declaredSpyUsername || '',
      voteCounts: game.votingResults.voteCounts ? { ...game.votingResults.voteCounts } : {},
      isRealSpy: Boolean(game.votingResults.isRealSpy),
      winningTeam: game.votingResults.winningTeam || 'loyalists',
      pointsAwardedUsernames: Array.isArray(game.votingResults.pointsAwardedUsernames)
        ? [...game.votingResults.pointsAwardedUsernames]
        : [],
      totalVotesCast: Number(game.votingResults.totalVotesCast) || 0,
    };
  }

  return clean;
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

export async function syncGameToFirestore(game: SpyGame): Promise<void> {
  try {
    const clean = sanitizeGameForFirestore(game);
    await setDoc(doc(db, 'games', game.id), clean);
  } catch (err) {
    console.warn('Failed to sync game to Firestore:', err);
  }
}

export function getGameById(id: string): SpyGame | undefined {
  const games = getStoredGames();
  const search = id.trim().toLowerCase();
  return games.find(
    (g) =>
      g.id.toLowerCase() === search ||
      g.inviteCode.toLowerCase() === search ||
      g.id.toLowerCase() === `spy-${search}`
  );
}

export async function getGameByIdAsync(id: string): Promise<SpyGame | null> {
  const cleanId = id.trim();
  const cached = getGameById(cleanId);
  if (cached) return cached;

  try {
    // 1. Try document direct lookup as-is
    let docRef = doc(db, 'games', cleanId);
    let snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const parsed = parseFirestoreGame(snapshot.data());
      const games = getStoredGames();
      saveStoredGames([parsed, ...games.filter((g) => g.id !== parsed.id)]);
      return parsed;
    }

    // 2. Try uppercase
    docRef = doc(db, 'games', cleanId.toUpperCase());
    snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const parsed = parseFirestoreGame(snapshot.data());
      const games = getStoredGames();
      saveStoredGames([parsed, ...games.filter((g) => g.id !== parsed.id)]);
      return parsed;
    }

    // 3. Try with SPY- prefix
    if (!cleanId.toUpperCase().startsWith('SPY-')) {
      docRef = doc(db, 'games', `SPY-${cleanId.toUpperCase()}`);
      snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const parsed = parseFirestoreGame(snapshot.data());
        const games = getStoredGames();
        saveStoredGames([parsed, ...games.filter((g) => g.id !== parsed.id)]);
        return parsed;
      }
    }

    // 4. Search all documents in the games collection
    const allSnapshot = await getDocs(collection(db, 'games'));
    for (const d of allSnapshot.docs) {
      const data = d.data();
      const matchId = data.id?.toLowerCase() === cleanId.toLowerCase();
      const matchInvite = data.inviteCode?.toLowerCase() === cleanId.toLowerCase();
      const matchPrefix = data.id?.toLowerCase() === `spy-${cleanId.toLowerCase()}`;
      if (matchId || matchInvite || matchPrefix) {
        const parsed = parseFirestoreGame(data);
        const games = getStoredGames();
        saveStoredGames([parsed, ...games.filter((g) => g.id !== parsed.id)]);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error fetching game by ID from Firestore:', err);
  }

  return null;
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
    missionBriefing:
      missionBriefing.trim() ||
      'Infiltrate the secure perimeter. Identify the rogue operative before time expires.',
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
  saveStoredGames([newGame, ...games.filter((g) => g.id !== id)]);

  // Sync to Firestore in background
  syncGameToFirestore(newGame);

  return newGame;
}

export function joinSpyGame(gameId: string, user: AuthUser): SpyGame | null {
  const games = getStoredGames();
  const cleanSearch = gameId.trim().toLowerCase();
  const gameIndex = games.findIndex(
    (g) => g.id.toLowerCase() === cleanSearch || g.inviteCode.toLowerCase() === cleanSearch
  );
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  const alreadyIn = game.players.some(
    (p) => p.username.toLowerCase() === user.username.toLowerCase()
  );

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
    syncGameToFirestore(game);
  }

  return game;
}

export async function joinSpyGameAsync(gameId: string, user: AuthUser): Promise<SpyGame | null> {
  // Always query latest from Firestore first to prevent stale roster collisions
  const fetched = await getGameByIdAsync(gameId);
  const targetGame = fetched || getGameById(gameId);
  if (!targetGame) return null;

  const alreadyIn = targetGame.players.some(
    (p) => p.username.toLowerCase() === user.username.toLowerCase()
  );

  if (!alreadyIn) {
    if (targetGame.players.length >= targetGame.maxPlayers) {
      throw new Error('This operation roster is already full.');
    }
    targetGame.players.push({
      username: user.username,
      codename: user.codename,
      clearanceLevel: user.clearanceLevel,
      isHost: false,
      status: 'ready',
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: 0,
    });
  }

  const games = getStoredGames();
  saveStoredGames([targetGame, ...games.filter((g) => g.id.toLowerCase() !== targetGame.id.toLowerCase())]);
  await syncGameToFirestore(targetGame);
  return targetGame;
}

export function addBotOperative(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (game.players.length >= game.maxPlayers) return null;

  const botCodenames = ['BLACK_LOTUS', 'SILENT_ECHO', 'VECTOR_ZERO', 'NEON_SNAKE', 'PHANTOM_KEY'];
  const available = botCodenames.filter((cn) => !game.players.some((p) => p.codename === cn));
  const chosenCodename = available[0] || `AGENT_${Math.floor(100 + Math.random() * 900)}`;
  const botUsername = `bot_${chosenCodename.toLowerCase()}`;

  game.players.push({
    username: botUsername,
    codename: chosenCodename,
    clearanceLevel: 'LEVEL 3 - SECRET',
    isHost: false,
    status: 'ready',
    joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: 0,
  });

  games[gameIndex] = game;
  saveStoredGames(games);
  syncGameToFirestore(game);
  return game;
}

export function togglePlayerReady(gameId: string, username: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
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
  syncGameToFirestore(game);
  return game;
}

export function startSpyGame(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (game.players.length < 3) {
    throw new Error('At least 3 participants are required to start the game.');
  }

  // 1. Pick a random location from the 500 pre-existing locations
  const randomLocation = getRandomLocation();

  // 2. Calculate the number of spies required
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
  syncGameToFirestore(game);
  return game;
}

export function startVotingPhase(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  game.status = 'voting';
  game.votes = {};
  game.votingResults = undefined;

  // Automatically generate votes for bot agents (bots vote for another player)
  const isBot = (username: string) =>
    username.startsWith('bot_') ||
    ['black_lotus', 'silent_echo', 'vector_zero', 'neon_snake', 'phantom_key'].includes(
      username.toLowerCase()
    );

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
  syncGameToFirestore(game);
  return game;
}

export function castVote(
  gameId: string,
  voterUsername: string,
  suspectUsername: string
): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (!game.votes) game.votes = {};

  game.votes[voterUsername.toLowerCase()] = suspectUsername.toLowerCase();

  // Ensure all bot players have also voted
  const isBot = (username: string) =>
    username.startsWith('agent_') ||
    ['black_lotus', 'silent_echo', 'vector_zero', 'neon_snake', 'phantom_key'].includes(
      username.toLowerCase()
    );

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
  syncGameToFirestore(game);
  return game;
}

export function tallyVotesAndConclude(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  if (!game.votes) game.votes = {};

  // Ensure all players have voted (if anyone missed, assign random candidate)
  game.players.forEach((player) => {
    const pUser = player.username.toLowerCase();
    if (!game.votes![pUser]) {
      const candidates = game.players.filter((p) => p.username.toLowerCase() !== pUser);
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
  const declaredSpyUsername =
    sorted.length > 0 ? sorted[0][0] : game.players[0].username.toLowerCase();

  // Check if declared player is really a Spy
  const normalizedSpies = (game.spyUsernames || []).map((u) => u.toLowerCase());
  const isRealSpy = normalizedSpies.includes(declaredSpyUsername.toLowerCase());

  let winningTeam: 'spies' | 'loyalists';
  let pointsAwardedUsernames: string[] = [];

  if (!isRealSpy) {
    winningTeam = 'spies';
    pointsAwardedUsernames = [...normalizedSpies];
  } else {
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
  syncGameToFirestore(game);
  return game;
}

export function startNewRound(gameId: string): SpyGame | null {
  const games = getStoredGames();
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
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
  syncGameToFirestore(game);
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
  const gameIndex = games.findIndex((g) => g.id.toLowerCase() === gameId.toLowerCase());
  if (gameIndex === -1) return null;

  const game = games[gameIndex];
  game.status = status;
  if (status === 'recruiting') {
    game.selectedLocation = undefined;
    game.spyUsernames = undefined;
    game.totalSpiesCount = undefined;
    game.startedAt = undefined;
    game.votes = {};
    game.votingResults = undefined;
  }

  games[gameIndex] = game;
  saveStoredGames(games);
  syncGameToFirestore(game);
  return games[gameIndex];
}

/**
 * Real-time listener for all active games in Firestore
 */
export function subscribeToAllGames(callback: (games: SpyGame[]) => void): () => void {
  try {
    const colRef = collection(db, 'games');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const firestoreGames = snapshot.docs.map((docSnap) => parseFirestoreGame(docSnap.data()));
        // Merge with local games
        const localGames = getStoredGames();
        const firestoreMap = new Map(firestoreGames.map((g) => [g.id.toLowerCase(), g]));

        // Keep local only if not in firestore yet
        const merged: SpyGame[] = [...firestoreGames];
        for (const local of localGames) {
          if (!firestoreMap.has(local.id.toLowerCase())) {
            merged.push(local);
          }
        }

        // Sort by createdAt descending
        merged.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        callback(merged);
      },
      (error) => {
        console.warn('Firestore all games listener warning:', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish subscribeToAllGames listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for a specific game
 */
export function subscribeToGame(
  gameId: string,
  callback: (game: SpyGame | null) => void
): () => void {
  try {
    const cleanId = gameId.trim().toUpperCase();
    const docRef = doc(db, 'games', cleanId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }
        const updated = parseFirestoreGame(docSnap.data());
        // Update local storage
        const current = getStoredGames();
        const next = [updated, ...current.filter((g) => g.id.toLowerCase() !== updated.id.toLowerCase())];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('spy_games_updated'));
        callback(updated);
      },
      (error) => {
        console.warn('Firestore game listener warning:', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish subscribeToGame listener:', err);
    return () => {};
  }
}
