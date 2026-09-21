import React, { useState, useEffect } from 'react';
import { AuthUser, SpyGame } from '../types.ts';
import {
  getStoredGames,
  joinSpyGame,
  joinSpyGameAsync,
  getGameById,
  getGameByIdAsync,
  generateInviteLink,
  subscribeToAllGames,
  subscribeToGame,
} from '../utils/gameStorage.ts';
import { CreateGameModal } from './CreateGameModal.tsx';
import { GameLobbyView } from './GameLobbyView.tsx';
import { InviteModal } from './InviteModal.tsx';
import { LocationsGuideModal } from './LocationsGuideModal.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import {
  ShieldCheck,
  LogOut,
  Terminal,
  UserCheck,
  KeyRound,
  Radio,
  Plus,
  Share2,
  Users,
  Copy,
  Check,
  Play,
  Search,
  AlertCircle,
  ExternalLink,
  Database,
} from 'lucide-react';

interface AgentDashboardProps {
  user: AuthUser;
  onSignOut: () => void;
  initialGameId?: string | null;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  user,
  onSignOut,
  initialGameId,
}) => {
  const { t, language } = useLanguage();
  const [games, setGames] = useState<SpyGame[]>(() => getStoredGames());
  const [activeGame, setActiveGame] = useState<SpyGame | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [inviteModalGame, setInviteModalGame] = useState<SpyGame | null>(null);
  const [showLocationsGuide, setShowLocationsGuide] = useState(false);
  const [searchCode, setSearchCode] = useState(initialGameId || '');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Sync games state from localStorage and Firestore
  const refreshGames = () => {
    const loaded = getStoredGames();
    setGames(loaded);

    // If currently viewing a game, update its state too
    if (activeGame) {
      const refreshed = loaded.find((g) => g.id.toLowerCase() === activeGame.id.toLowerCase());
      if (refreshed) {
        setActiveGame(refreshed);
      }
    }
  };

  // Subscribe to all games in Firestore for real-time multiplayer updates
  useEffect(() => {
    refreshGames();

    const unsubscribeAll = subscribeToAllGames((updatedList) => {
      setGames(updatedList);
      if (activeGame) {
        const refreshed = updatedList.find((g) => g.id.toLowerCase() === activeGame.id.toLowerCase());
        if (refreshed) {
          setActiveGame(refreshed);
        }
      }
    });

    const handleStorage = () => refreshGames();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('spy_games_updated', handleStorage);

    return () => {
      unsubscribeAll();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('spy_games_updated', handleStorage);
    };
  }, [activeGame?.id]);

  // Real-time listener specifically for the active game room
  useEffect(() => {
    if (!activeGame?.id) return;

    const unsubscribeActive = subscribeToGame(activeGame.id, (realtimeGame) => {
      if (realtimeGame) {
        setActiveGame(realtimeGame);
      }
    });

    return () => {
      unsubscribeActive();
    };
  }, [activeGame?.id]);

  // Handle incoming invite if initialGameId was provided
  useEffect(() => {
    if (!initialGameId || activeGame) return;

    let active = true;
    let attempt = 0;
    // The host's game write to Firestore is fire-and-forget, so a freshly
    // loaded invitee page (fresh client, empty cache) can query before that
    // write has propagated. Retry briefly instead of failing on the first miss.
    const maxAttempts = 5;
    const retryDelayMs = 700;

    const attemptJoin = () => {
      joinSpyGameAsync(initialGameId, user)
        .then((joined) => {
          if (!active) return;
          if (joined) {
            setActiveGame(joined);
          } else if (attempt < maxAttempts) {
            attempt += 1;
            setTimeout(attemptJoin, retryDelayMs);
          }
        })
        .catch(() => {
          // A thrown error (e.g. roster full) is a real rule violation, not a
          // transient lookup miss - fall back to a read-only view instead of retrying.
          if (!active) return;
          getGameByIdAsync(initialGameId).then((found) => {
            if (active && found) {
              setActiveGame(found);
            }
          });
        });
    };

    attemptJoin();

    return () => {
      active = false;
    };
  }, [initialGameId]);

  const handleCreateGameSuccess = (newGame: SpyGame) => {
    setIsCreatingGame(false);
    refreshGames();
    setActiveGame(newGame);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    let cleanCode = searchCode.trim();
    if (!cleanCode) {
      setJoinError(t('err_enter_code'));
      return;
    }

    // Support full invitation link pasted
    try {
      if (cleanCode.includes('http://') || cleanCode.includes('https://') || cleanCode.includes('?')) {
        const url = new URL(cleanCode.startsWith('http') ? cleanCode : window.location.origin + '/' + cleanCode);
        const code = url.searchParams.get('game') || url.searchParams.get('join');
        if (code) {
          cleanCode = code;
        }
      }
    } catch {
      // not a url, proceed
    }

    setIsJoining(true);
    try {
      const joined = await joinSpyGameAsync(cleanCode, user);
      if (joined) {
        setActiveGame(joined);
        setSearchCode('');
        refreshGames();
      } else {
        setJoinError(t('err_op_not_found', { code: cleanCode }));
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Unable to join operation.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyLink = async (game: SpyGame, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateInviteLink(game.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedGameId(game.id);
      setTimeout(() => setCopiedGameId(null), 2000);
    } catch {
      setCopiedGameId(game.id);
      setTimeout(() => setCopiedGameId(null), 2000);
    }
  };

  // If in an active game lobby, display the lobby
  if (activeGame) {
    return (
      <GameLobbyView
        game={activeGame}
        currentUser={user}
        onLeave={() => setActiveGame(null)}
        onGameUpdated={(updated) => {
          setActiveGame(updated);
          refreshGames();
        }}
      />
    );
  }

  // Filter operations relevant to this user or available
  const myOperations = games.filter(
    (g) =>
      g.hostUsername.toLowerCase() === user.username.toLowerCase() ||
      g.players.some((p) => p.username.toLowerCase() === user.username.toLowerCase())
  );

  return (
    <div id="agent-dashboard-container" className="w-full max-w-4xl mx-auto space-y-6">
      {/* Operative Profile Header Bar */}
      <div
        id="dashboard-header-card"
        className="bg-neutral-900/90 border border-emerald-500/30 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-2xl text-neutral-100"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                  {t('terminal_active')}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{t('operative_label')}</span>
                <span className="text-emerald-400 font-mono">{user.codename}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-locations-guide-top"
              type="button"
              onClick={() => setShowLocationsGuide(true)}
              className="py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-emerald-400 border border-neutral-800 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title={t('locations_ref_db')}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{t('locations_ref_db')}</span>
            </button>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
              {user.terminalId}
            </span>
            <button
              id="btn-sign-out-top"
              type="button"
              onClick={onSignOut}
              className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Terminate authenticated session"
            >
              <LogOut className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t('sign_out')}</span>
            </button>
          </div>
        </div>

        {/* Quick specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="bg-neutral-950/70 border border-neutral-850 p-2.5 rounded-lg">
            <span className="text-[10px] text-neutral-500 block">{t('stat_username')}</span>
            <span className="text-neutral-200 font-semibold truncate block">{user.username}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-850 p-2.5 rounded-lg">
            <span className="text-[10px] text-neutral-500 block">{t('stat_clearance')}</span>
            <span className="text-emerald-400 font-semibold truncate block">{user.clearanceLevel}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-850 p-2.5 rounded-lg">
            <span className="text-[10px] text-neutral-500 block">{t('stat_encryption')}</span>
            <span className="text-neutral-200 font-semibold block">AES-256 GCM</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-850 p-2.5 rounded-lg">
            <span className="text-[10px] text-neutral-500 block">{t('stat_operations')}</span>
            <span className="text-emerald-300 font-semibold block">{myOperations.length} {t('stat_active_suffix')}</span>
          </div>
        </div>
      </div>

      {/* Main Operations Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Create Operation Card */}
        <div className="md:col-span-2 bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                <Radio className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                {t('mission_command')}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              {t('mission_command_desc')}
            </p>
          </div>

          <button
            id="btn-create-game-trigger"
            type="button"
            onClick={() => setIsCreatingGame(true)}
            className="w-full sm:w-auto self-start py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('create_new_spy_game')}</span>
          </button>
        </div>

        {/* Join by Link / Code Card */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded bg-neutral-800 text-neutral-300">
                <KeyRound className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                {t('join_operation')}
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              {t('join_op_desc')}
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="space-y-2">
            <div className="relative">
              <input
                id="input-join-code"
                type="text"
                value={searchCode}
                onChange={(e) => {
                  setSearchCode(e.target.value);
                  if (joinError) setJoinError(null);
                }}
                placeholder={t('join_placeholder')}
                className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 font-mono outline-none"
              />
            </div>

            {joinError && (
              <p className="text-[11px] text-red-400 font-mono flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{joinError}</span>
              </p>
            )}

            <button
              id="btn-submit-join-code"
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t('connect_mission')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Operations List */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {t('classified_operations', { count: myOperations.length })}
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-500">{t('auto_synced')}</span>
        </div>

        {myOperations.length === 0 ? (
          <div className="text-center py-10 px-4 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-lg">
            <Radio className="w-8 h-8 text-neutral-600 mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-neutral-300 font-mono">{t('no_operations')}</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {t('no_operations_desc')}
            </p>
            <button
              type="button"
              onClick={() => setIsCreatingGame(true)}
              className="mt-4 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('create_operation_btn')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {myOperations.map((game) => {
              const isHost = game.hostUsername.toLowerCase() === user.username.toLowerCase();
              const isCopied = copiedGameId === game.id;
              return (
                <div
                  key={game.id}
                  className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Status & Code */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                        {game.id}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          game.status === 'active'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                            : game.players.length >= 3
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : 'bg-neutral-850 text-neutral-400 border border-neutral-750'
                        }`}
                      >
                        {game.status === 'active'
                          ? t('status_active')
                          : game.players.length >= 3
                          ? t('status_ready')
                          : t('status_needs_more', { count: 3 - game.players.length })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white tracking-tight mb-1 font-mono">
                      {game.title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-1 mb-3 flex items-center gap-1.5">
                      <span className="text-emerald-500/70 font-mono text-[11px]">{t('pool_label')}</span>
                      <span>{t('pool_500')}</span>
                    </p>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-neutral-400" />
                        {game.players.length}/{game.maxPlayers} {t('agents_count')}
                      </span>
                      <span>&bull;</span>
                      <span>{isHost ? t('host_you') : t('host_user', { host: game.hostCodename })}</span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="pt-3 border-t border-neutral-900 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveGame(game)}
                      className="py-1.5 px-3 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>{t('enter_lobby')}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(game, e)}
                        className="py-1.5 px-2.5 rounded bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs font-mono flex items-center gap-1 border border-neutral-750 transition-colors cursor-pointer"
                        title={t('copy_link')}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">{t('copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-neutral-400" />
                            <span className="text-[11px]">{t('copy_link')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setInviteModalGame(game)}
                        className="p-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 transition-colors cursor-pointer"
                        title={t('invite_operatives')}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreatingGame && (
        <CreateGameModal
          user={user}
          onClose={() => setIsCreatingGame(false)}
          onGameCreated={handleCreateGameSuccess}
        />
      )}

      {inviteModalGame && (
        <InviteModal
          game={inviteModalGame}
          onClose={() => setInviteModalGame(null)}
          onOperativeAdded={refreshGames}
        />
      )}

      {showLocationsGuide && (
        <LocationsGuideModal
          onClose={() => setShowLocationsGuide(false)}
        />
      )}
    </div>
  );
};
