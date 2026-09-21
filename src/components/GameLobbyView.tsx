import React, { useState } from 'react';
import { AuthUser, SpyGame } from '../types.ts';
import {
  generateInviteLink,
  togglePlayerReady,
  updateGameStatus,
  addBotOperative,
  getSpyCount,
  startVotingPhase,
  castVote,
  tallyVotesAndConclude,
  startNewRound,
} from '../utils/gameStorage.ts';
import { getLocationName } from '../data/locations.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { InviteModal } from './InviteModal.tsx';
import { LocationsGuideModal } from './LocationsGuideModal.tsx';
import {
  Share2,
  Copy,
  Check,
  Users,
  Shield,
  Radio,
  Play,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
  Database,
  MapPin,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Lock,
  Vote,
  Trophy,
  Flame,
  UserCheck,
  UserX,
} from 'lucide-react';

interface GameLobbyViewProps {
  game: SpyGame;
  currentUser: AuthUser;
  onLeave: () => void;
  onGameUpdated: (updatedGame: SpyGame) => void;
}

export const GameLobbyView: React.FC<GameLobbyViewProps> = ({
  game,
  currentUser,
  onLeave,
  onGameUpdated,
}) => {
  const { t, language } = useLanguage();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLocationsGuide, setShowLocationsGuide] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [revealRole, setRevealRole] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [spyGuessFeedback, setSpyGuessFeedback] = useState<string | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<string>('');

  const isHost = game.hostUsername.toLowerCase() === currentUser.username.toLowerCase();
  const inviteUrl = generateInviteLink(game.id);
  const myVote = game.votes?.[currentUser.username.toLowerCase()];

  const handleQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedQuick(true);
      setTimeout(() => setCopiedQuick(false), 2000);
    } catch {
      setCopiedQuick(true);
      setTimeout(() => setCopiedQuick(false), 2000);
    }
  };

  const handleToggleReady = () => {
    const updated = togglePlayerReady(game.id, currentUser.username);
    if (updated) onGameUpdated(updated);
  };

  const handleAddAgent = () => {
    const updated = addBotOperative(game.id);
    if (updated) onGameUpdated(updated);
  };

  const handleLaunchGame = () => {
    if (game.players.length < 3) return;
    const updated = updateGameStatus(game.id, 'active');
    if (updated) {
      setRevealRole(false);
      setShowDebrief(false);
      setSpyGuessFeedback(null);
      setSelectedSuspect('');
      onGameUpdated(updated);
    }
  };

  const handleStartGuessingPhase = () => {
    const updated = startVotingPhase(game.id);
    if (updated) {
      setSelectedSuspect('');
      onGameUpdated(updated);
    }
  };

  const handleCastVote = (suspect: string) => {
    if (!suspect) return;
    const updated = castVote(game.id, currentUser.username, suspect);
    if (updated) {
      setSelectedSuspect(suspect);
      onGameUpdated(updated);
    }
  };

  const handleTallyVotes = () => {
    const updated = tallyVotesAndConclude(game.id);
    if (updated) {
      onGameUpdated(updated);
    }
  };

  const handleStartNextRound = () => {
    const updated = startNewRound(game.id);
    if (updated) {
      setRevealRole(false);
      setShowDebrief(false);
      setSpyGuessFeedback(null);
      setSelectedSuspect('');
      onGameUpdated(updated);
    }
  };

  const handleResetToRecruiting = () => {
    const updated = updateGameStatus(game.id, 'recruiting');
    if (updated) {
      setRevealRole(false);
      setShowDebrief(false);
      setSpyGuessFeedback(null);
      setSelectedSuspect('');
      onGameUpdated(updated);
    }
  };

  // Determine current user's role
  const isSpy = game.spyUsernames
    ? game.spyUsernames.includes(currentUser.username.toLowerCase())
    : false;

  const targetLocation = game.selectedLocation || game.secretLocation || 'Palace';
  const targetLocationLocalized =
    language === 'uk' ? getLocationName(targetLocation, 'uk') : targetLocation;
  const spyCount = game.totalSpiesCount || getSpyCount(game.players.length);

  const handleSpyGuessLocation = (guessedLocation: string) => {
    const normGuessed = guessedLocation.trim().toLowerCase();
    const normTarget = targetLocation.trim().toLowerCase();
    const ukTarget = getLocationName(targetLocation, 'uk').trim().toLowerCase();
    const enGuessed = getLocationName(guessedLocation, 'en').trim().toLowerCase();

    const isCorrect =
      normGuessed === normTarget ||
      normGuessed === ukTarget ||
      enGuessed === normTarget;

    if (isCorrect) {
      setSpyGuessFeedback(t('target_identified', { loc: guessedLocation }));
    } else {
      setSpyGuessFeedback(t('incorrect_guess', { loc: guessedLocation }));
    }
  };

  return (
    <div id="game-lobby-view" className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-hq"
          type="button"
          onClick={onLeave}
          className="text-xs font-mono text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('return_hq')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="btn-view-locations-guide"
            type="button"
            onClick={() => setShowLocationsGuide(true)}
            className="text-xs font-mono px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t('view_500_pool')}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('view_500_pool')}</span>
          </button>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
            ID: <span className="text-emerald-400 font-bold">{game.id}</span>
          </span>
        </div>
      </div>

      {/* Main Operation Header Card */}
      <div id="lobby-header" className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  game.status === 'active'
                    ? 'bg-amber-400 animate-ping'
                    : game.status === 'voting'
                    ? 'bg-purple-400 animate-pulse'
                    : game.status === 'completed'
                    ? 'bg-emerald-400'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              ></span>
              <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                {game.status === 'active'
                  ? t('interrogation_active')
                  : game.status === 'voting'
                  ? t('guessing_accuse_spy')
                  : game.status === 'completed'
                  ? t('operation_concluded')
                  : t('lobby_recruiting')}
              </span>
              <span className="text-neutral-600">&bull;</span>
              <span className="text-xs font-mono text-neutral-400">
                {game.players.length} {t('agents_count')} &bull; {spyCount}{' '}
                {spyCount === 1 ? t('spy_singular') : t('spies_plural')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{game.title}</h1>
            <p className="text-xs text-neutral-400 mt-1">
              {t('directed_by')}{' '}
              <span className="text-neutral-200 font-semibold">{game.hostCodename}</span>
            </p>
          </div>

          {/* Prominent Invite Link Button */}
          <button
            id="btn-open-invite-modal"
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="self-start sm:self-center py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('send_invite_link')}</span>
          </button>
        </div>

        {/* Quick Link Share Bar */}
        <div id="quick-invite-bar" className="mt-4 p-3 rounded-lg bg-neutral-950/80 border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 w-full sm:w-auto truncate">
            <span className="text-emerald-400 shrink-0 font-bold">{t('invite_link_label')}</span>
            <span className="text-neutral-300 truncate select-all">{inviteUrl}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              id="btn-quick-copy-link"
              type="button"
              onClick={handleQuickCopy}
              className="flex-1 sm:flex-none py-1.5 px-3 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
            >
              {copiedQuick ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{t('copied_excl')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('copy_link_btn')}</span>
                </>
              )}
            </button>
            <a
              id="btn-quick-test-tab"
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2.5 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-mono flex items-center justify-center border border-neutral-700 transition-colors"
              title={t('open_in_tab')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Spy Rules & Protocol Protocol Card (In Lobby) */}
      {game.status === 'recruiting' && (
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4 sm:p-5 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>{t('spy_protocol_title')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationsGuide(true)}
              className="text-neutral-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>{t('browse_500_places')}</span>
            </button>
          </div>

          <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-850 space-y-2 text-neutral-300">
            <p className="leading-relaxed">
              &bull; {t('pool_desc')}
            </p>
            <p className="leading-relaxed">
              &bull; <strong className="text-emerald-300">{t('info_asymmetry_title')}</strong> {t('info_asymmetry_desc')}
            </p>
            <p className="leading-relaxed">
              &bull; <strong className="text-white">{t('spy_scale_title')}</strong>
              <span className="text-neutral-400 ml-1">
                {t('spy_scale_desc')}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <span>
              {t('current_roster_label')}{' '}
              <strong className="text-emerald-400">
                {game.players.length} {t('agents_count')}
              </strong>
            </span>
            <span className="text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              &rarr; {spyCount} {spyCount === 1 ? t('spy_singular') : t('spies_plural')} {t('will_be_deployed')}
            </span>
          </div>
        </div>
      )}

      {/* Active Mission Secret Intel Card (Visible during Active game) */}
      {game.status === 'active' && (
        <div
          id="active-mission-briefing"
          className={`border rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-2xl transition-all ${
            revealRole && isSpy
              ? 'bg-neutral-900/95 border-red-500/50'
              : revealRole
              ? 'bg-neutral-900/95 border-emerald-500/50'
              : 'bg-neutral-900/90 border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${isSpy && revealRole ? 'text-red-400' : 'text-amber-400'}`} />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono">
                  {t('classified_assignment')}
                </h2>
                <div className="text-[11px] font-mono text-neutral-400">
                  {game.players.length} {t('operatives_active')} &bull; {spyCount} {t('undercover_spies')}{' '}
                  {spyCount === 1 ? t('spy_singular') : t('spies_plural')}
                </div>
              </div>
            </div>

            <button
              id="btn-toggle-classified-dossier"
              type="button"
              onClick={() => setRevealRole(!revealRole)}
              className={`text-xs font-mono flex items-center gap-1.5 py-1.5 px-3 rounded cursor-pointer transition-all ${
                revealRole
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750 border border-neutral-700'
                  : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 border border-amber-500/40 shadow-lg shadow-amber-950/40 font-semibold'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{revealRole ? t('hide_role_btn') : t('reveal_role_btn')}</span>
            </button>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-sm space-y-4">
            {revealRole ? (
              <div className="animate-in fade-in duration-200 space-y-3">
                {isSpy ? (
                  /* Spy View */
                  <div className="p-4 bg-red-950/40 border border-red-600/70 rounded-lg text-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-red-400 font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                        <span>{t('assigned_role_spy')}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/60">
                        {t('undercover_infiltrator')}
                      </span>
                    </div>

                    <div className="p-3 bg-red-950/60 border border-red-800/60 rounded flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-red-400 uppercase tracking-wide">
                          {t('secret_location_spy_title')}
                        </div>
                        <div className="text-base sm:text-lg font-bold text-red-100 flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-red-400" />
                          <span>{t('unknown_classified')}</span>
                        </div>
                      </div>
                      <span className="text-xs text-red-300 font-semibold text-right">
                        {t('you_do_not_know_loc')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-neutral-300">
                      <p>&bull; {t('spy_mission_notice')}</p>
                      <p>&bull; {t('spy_objective_body')}</p>
                      <p>
                        &bull; {spyCount === 1 ? `1 ${t('spy_singular')}` : `${spyCount} ${t('spies_plural')}`}
                      </p>
                    </div>

                    {/* Spy Action Helper */}
                    <div className="pt-2 border-t border-red-900/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowLocationsGuide(true)}
                        className="w-full sm:w-auto py-2 px-3.5 rounded bg-red-900/80 hover:bg-red-800 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{t('browse_500_guess')}</span>
                      </button>

                      {spyGuessFeedback && (
                        <span className="text-[11px] font-mono text-amber-300 font-semibold">
                          {spyGuessFeedback}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Loyal Operative View */
                  <div className="p-4 bg-emerald-950/40 border border-emerald-600/70 rounded-lg text-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-400 font-bold text-xs tracking-widest uppercase flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span>{t('assigned_role_loyal')}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                        {t('field_agent')}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-emerald-400 uppercase tracking-wide">
                          {t('secret_location_loyal_title')}
                        </div>
                        <div className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-400" />
                          <span className="underline decoration-emerald-500/60 underline-offset-4">
                            {targetLocationLocalized}
                          </span>
                          {language === 'uk' && (
                            <span className="text-xs text-neutral-400 font-normal">
                              ({targetLocation})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLocationsGuide(true)}
                        className="py-1 px-2.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-emerald-700/50 text-[11px] text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Database className="w-3 h-3" />
                        <span>{t('browse_500_places')}</span>
                      </button>
                    </div>

                    <div className="text-xs space-y-1.5 text-neutral-300">
                      <p>
                        &bull; {t('loyal_mission_notice')} <strong className="text-white">{targetLocationLocalized}</strong>.
                      </p>
                      <p>
                        &bull; <strong className="text-red-300">{t('loyal_spy_warning', { count: spyCount })}</strong>
                      </p>
                      <p>
                        &bull; {t('loyal_objective_body')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-xs text-neutral-300 font-bold">
                  {t('dossier_encrypted')}
                </div>
                <div className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  {t('dossier_encrypted_hint')}
                </div>
              </div>
            )}

            {/* Debrief summary if requested */}
            {showDebrief && (
              <div className="mt-3 p-3 bg-neutral-900 border border-neutral-700 rounded-lg text-xs space-y-2">
                <div className="text-emerald-400 font-bold uppercase tracking-wider">
                  {t('unmasked_dossier')}
                </div>
                <div className="text-neutral-300">
                  {t('target_location_label')}{' '}
                  <strong className="text-white">{targetLocationLocalized} ({targetLocation})</strong>
                </div>
                <div className="text-neutral-300">
                  {t('undercover_spies_label')}{' '}
                  <strong className="text-red-400">
                    {game.spyUsernames && game.spyUsernames.length > 0
                      ? game.spyUsernames.map((u) => `@${u}`).join(', ')
                      : t('none_assigned')}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Active controls */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowLocationsGuide(true)}
              className="text-xs font-mono text-neutral-400 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('view_500_pool')}</span>
            </button>

            {isHost && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-start-guessing-phase-active"
                  type="button"
                  onClick={handleStartGuessingPhase}
                  className="text-xs font-mono font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/50 cursor-pointer"
                >
                  <Vote className="w-3.5 h-3.5 text-neutral-950" />
                  <span>{t('start_guessing_phase')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDebrief(!showDebrief)}
                  className="text-xs font-mono text-neutral-300 hover:text-white px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 cursor-pointer"
                >
                  {showDebrief ? t('hide_debrief') : t('show_debrief')}
                </button>
                <button
                  type="button"
                  onClick={handleResetToRecruiting}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('new_round_lobby')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guessing & Voting Phase Card (When game is in voting state) */}
      {game.status === 'voting' && (
        <div
          id="voting-phase-card"
          className="bg-neutral-900/95 border border-purple-500/50 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5 font-mono"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-300">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  {t('guessing_phase_title')}
                </h2>
                <p className="text-xs text-neutral-400">
                  {t('guessing_phase_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold">
                {t('accusations_cast', {
                  voted: Object.keys(game.votes || {}).length,
                  total: game.players.length,
                })}
              </span>
            </div>
          </div>

          {/* Rules of Engagement Banner */}
          <div className="p-3.5 bg-neutral-950/90 rounded-lg border border-purple-900/40 text-xs space-y-2 text-neutral-300">
            <div className="text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>{t('rules_of_engagement')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2.5 rounded bg-neutral-900/80 border border-neutral-800 space-y-1">
                <span className="text-amber-400 font-bold block">{t('case_a_title')}</span>
                <p className="text-neutral-400 leading-snug">
                  {t('case_a_desc')}
                </p>
              </div>
              <div className="p-2.5 rounded bg-neutral-900/80 border border-neutral-800 space-y-1">
                <span className="text-emerald-400 font-bold block">{t('case_b_title')}</span>
                <p className="text-neutral-400 leading-snug">
                  {t('case_b_desc')}
                </p>
              </div>
            </div>
          </div>

          {/* Voting Action Section */}
          <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-bold tracking-wider uppercase">
                {myVote ? t('status_accusation') : t('cast_accusation')}
              </span>
              {myVote && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('accusation_locked', { target: myVote })}</span>
                </span>
              )}
            </div>

            {/* Suspects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {game.players.map((suspect) => {
                const isMe = suspect.username.toLowerCase() === currentUser.username.toLowerCase();
                const isSelected = (selectedSuspect || myVote) === suspect.username.toLowerCase();
                return (
                  <button
                    key={suspect.username}
                    type="button"
                    disabled={isMe}
                    onClick={() => {
                      if (!isMe) {
                        setSelectedSuspect(suspect.username.toLowerCase());
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isMe
                        ? 'opacity-40 cursor-not-allowed bg-neutral-950 border-neutral-850'
                        : isSelected
                        ? 'bg-purple-950/50 border-purple-500 text-white shadow-md shadow-purple-950/40 cursor-pointer ring-1 ring-purple-500/50'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {suspect.codename.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{suspect.codename}</span>
                          {isMe && <span className="text-[10px] text-neutral-500 font-normal">({t('you_do_not_know_loc') ? 'You' : 'You'})</span>}
                        </div>
                        <div className="text-[10px] text-neutral-500">@{suspect.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isMe && (
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-purple-400 bg-purple-500' : 'border-neutral-700'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm Vote Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500">
                {myVote
                  ? t('switch_suspect_instruction')
                  : t('select_suspect_instruction')}
              </span>

              <button
                id="btn-confirm-cast-vote"
                type="button"
                disabled={!selectedSuspect && !myVote}
                onClick={() => {
                  const target = selectedSuspect || myVote;
                  if (target) handleCastVote(target);
                }}
                className={`w-full sm:w-auto py-2 px-5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedSuspect && selectedSuspect !== myVote
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : myVote
                    ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700'
                    : 'bg-neutral-800 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>
                  {selectedSuspect && selectedSuspect !== myVote
                    ? t('lock_in_accusation', { target: selectedSuspect })
                    : myVote
                    ? t('accusation_confirmed', { target: myVote })
                    : t('select_suspect')}
                </span>
              </button>
            </div>
          </div>

          {/* Voting Roster Progress */}
          <div className="p-3 bg-neutral-950/70 rounded-lg border border-neutral-855">
            <div className="text-[11px] text-neutral-400 font-bold uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>{t('operatives_participation')}</span>
              <span className="text-neutral-500 font-normal">{t('identities_concealed')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {game.players.map((p) => {
                const hasVoted = Boolean(game.votes?.[p.username.toLowerCase()]);
                return (
                  <div
                    key={p.username}
                    className={`p-2 rounded border flex items-center justify-between ${
                      hasVoted
                        ? 'bg-purple-950/30 border-purple-500/30 text-purple-300'
                        : 'bg-neutral-900 border-neutral-850 text-neutral-500'
                    }`}
                  >
                    <span className="truncate">{p.codename}</span>
                    <span className="text-[10px] shrink-0 font-bold">
                      {hasVoted ? t('voted_tag') : t('pending_tag')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Host Tally Controls */}
          {isHost ? (
            <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-neutral-400">
                {t('commander_controls_tally')}
              </span>

              <button
                id="btn-tally-votes-conclude"
                type="button"
                onClick={handleTallyVotes}
                className="w-full sm:w-auto py-2.5 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tally_votes_btn')}</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <span>{t('awaiting_commander_tally')}</span>
            </div>
          )}
        </div>
      )}

      {/* Completed / Debrief & Scoreboard Card (When game is completed) */}
      {game.status === 'completed' && game.votingResults && (
        <div
          id="operation-results-card"
          className={`border rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-6 font-mono ${
            game.votingResults.winningTeam === 'loyalists'
              ? 'bg-neutral-900/95 border-emerald-500/50'
              : 'bg-neutral-900/95 border-red-500/50'
          }`}
        >
          {/* Victory Banner */}
          <div
            className={`p-4 sm:p-5 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              game.votingResults.winningTeam === 'loyalists'
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-950/40'
                : 'bg-red-950/50 border-red-500 text-red-100 shadow-lg shadow-red-950/40'
            }`}
          >
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  game.votingResults.winningTeam === 'loyalists'
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'bg-red-600 text-white'
                }`}
              >
                {game.votingResults.winningTeam === 'loyalists' ? (
                  <Trophy className="w-6 h-6" />
                ) : (
                  <Flame className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-widest opacity-80">
                  {t('verdict_reached')}
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {game.votingResults.winningTeam === 'loyalists'
                    ? t('loyalists_win')
                    : t('spies_win')}
                </h2>
                <p className="text-xs opacity-90 mt-0.5 leading-snug">
                  {game.votingResults.winningTeam === 'loyalists'
                    ? t('loyalists_win_details', {
                        spy: game.votingResults.declaredSpyUsername,
                        votes: game.votingResults.voteCounts[game.votingResults.declaredSpyUsername] || 0,
                      })
                    : t('spies_win_details', {
                        spy: game.votingResults.declaredSpyUsername,
                        votes: game.votingResults.voteCounts[game.votingResults.declaredSpyUsername] || 0,
                      })}
                </p>
              </div>
            </div>

            <div className="shrink-0 px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-700 text-xs font-bold text-center">
              <span className="text-[10px] text-neutral-400 block uppercase">{t('points_awarded')}</span>
              <span className="text-amber-400 font-mono text-sm">
                {t('plus_one_to', {
                  team: game.votingResults.winningTeam === 'loyalists' ? t('not_spies') : t('real_spies'),
                })}
              </span>
            </div>
          </div>

          {/* Intel Triad Dossier */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Accused Spy */}
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wide block">
                {t('declared_spy')}
              </span>
              <div className="font-bold text-sm text-white flex items-center justify-between">
                <span>@{game.votingResults.declaredSpyUsername}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-850 text-neutral-300">
                  {t('votes_count', {
                    count: game.votingResults.voteCounts[game.votingResults.declaredSpyUsername] || 0,
                  })}
                </span>
              </div>
              <div className="text-[11px] pt-1 border-t border-neutral-850">
                {game.votingResults.isRealSpy ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('real_spy_confirmed')}</span>
                  </span>
                ) : (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5" />
                    <span>{t('innocent_operative')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Real Spies */}
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wide block">
                {t('actual_spies_label')}
              </span>
              <div className="font-bold text-sm text-red-400 truncate">
                {game.spyUsernames && game.spyUsernames.length > 0
                  ? game.spyUsernames.map((u) => `@${u}`).join(', ')
                  : t('unknown_classified')}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
                {t('operatives_active')}: {game.totalSpiesCount || getSpyCount(game.players.length)}
              </div>
            </div>

            {/* Secret Location */}
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wide block">
                {t('classified_loc_pool_label')}
              </span>
              <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{targetLocationLocalized}</span>
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setShowLocationsGuide(true)}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                >
                  <Database className="w-3 h-3" />
                  <span>{t('browse_500_places')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Voting Ledger Breakdown */}
          <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-300 font-bold uppercase tracking-wider">
              <span>{t('votes_cast_ledger')}</span>
              <span className="text-neutral-500 font-normal">
                {t('total_accusations', { total: game.votingResults.totalVotesCast })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(game.votes || {}).map(([voter, suspect]) => {
                const voterOperative = game.players.find(
                  (p) => p.username.toLowerCase() === voter.toLowerCase()
                );
                const suspectOperative = game.players.find(
                  (p) => p.username.toLowerCase() === suspect.toLowerCase()
                );
                return (
                  <div
                    key={voter}
                    className="p-2 rounded bg-neutral-900 border border-neutral-850 flex items-center justify-between"
                  >
                    <span className="text-neutral-300">
                      {voterOperative?.codename || voter} <span className="text-neutral-500">(@{voter})</span>
                    </span>
                    <span className="text-neutral-500 mx-1">&rarr;</span>
                    <span className="font-bold text-purple-300">
                      {t('accused_user', {
                        suspect: `${suspectOperative?.codename || suspect} (@${suspect})`,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cumulative Scoreboard Leaderboard */}
          <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{t('scoreboard_title')}</span>
              </div>
              <span className="text-[11px] text-neutral-500">
                {t('one_point_per_victory')}
              </span>
            </div>

            <div className="space-y-1.5">
              {[...game.players]
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((player, rank) => {
                  const wonThisRound = game.votingResults?.pointsAwardedUsernames.includes(
                    player.username.toLowerCase()
                  );
                  return (
                    <div
                      key={player.username}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        wonThisRound
                          ? 'bg-amber-950/20 border-amber-500/40 text-white'
                          : 'bg-neutral-900 border-neutral-850 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-neutral-500 w-4">
                          #{rank + 1}
                        </span>
                        <div>
                          <span className="font-bold">{player.codename}</span>
                          <span className="text-neutral-500 ml-1.5">@{player.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {wonThisRound && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>{t('won_plus_one')}</span>
                          </span>
                        )}
                        <span className="font-bold text-amber-400 text-sm font-mono">
                          {player.score ?? 0} {t('pts')}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Post-Game Actions */}
          <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onLeave}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('return_hq')}</span>
            </button>

            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  id="btn-return-lobby"
                  type="button"
                  onClick={handleResetToRecruiting}
                  className="text-xs font-mono text-neutral-300 hover:text-white px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 cursor-pointer"
                >
                  {t('return_to_lobby')}
                </button>
                <button
                  id="btn-start-next-round"
                  type="button"
                  onClick={handleStartNextRound}
                  className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('start_next_round')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operatives Roster */}
      <div id="operatives-roster" className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {t('operatives_roster', {
                  current: game.players.length,
                  max: game.maxPlayers,
                })}
              </h2>
              <p className="text-[10px] font-mono text-neutral-500">
                {game.status === 'active'
                  ? t('roster_active_hint')
                  : t('roster_lobby_hint')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {game.status === 'recruiting' && game.players.length < game.maxPlayers && (
              <>
                <button
                  id="btn-add-bot-operative"
                  type="button"
                  onClick={handleAddAgent}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 flex items-center gap-1 cursor-pointer"
                  title={t('add_bot_agent')}
                >
                  <span>{t('add_bot_agent')}</span>
                </button>
                <button
                  id="btn-add-two-bots"
                  type="button"
                  onClick={() => {
                    handleAddAgent();
                    handleAddAgent();
                  }}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 flex items-center gap-1 cursor-pointer"
                  title="Add two bot operatives"
                >
                  <span>+2 Bots</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-2.5">
          {game.players.map((player, idx) => {
            const isMe = player.username.toLowerCase() === currentUser.username.toLowerCase();
            return (
              <div
                key={player.username + idx}
                className={`p-3.5 rounded-lg border flex items-center justify-between transition-all ${
                  isMe
                    ? 'bg-neutral-950 border-emerald-500/40 shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">{player.codename}</span>
                      {player.isHost && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 uppercase font-semibold">
                          HOST / CREATOR
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {t('identity_credentials') ? 'You' : 'You'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono flex items-center gap-2">
                      <span>ID: @{player.username}</span>
                      <span>&bull;</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{player.score ?? 0} {t('pts')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {game.status === 'voting' ? (
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 ${
                        game.votes?.[player.username.toLowerCase()]
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>
                        {game.votes?.[player.username.toLowerCase()]
                          ? t('voted_tag')
                          : t('pending_tag')}
                      </span>
                    </span>
                  ) : game.status === 'completed' ? (
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 ${
                        game.votingResults?.pointsAwardedUsernames.includes(
                          player.username.toLowerCase()
                        )
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{player.score ?? 0} {t('pts')}</span>
                    </span>
                  ) : game.status === 'active' ? (
                    <span className="text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 bg-neutral-850 text-neutral-300 border border-neutral-750">
                      <Shield className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{t('unknown_classified')}</span>
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-mono px-2.5 py-1 rounded flex items-center gap-1.5 ${
                        player.status === 'ready'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="capitalize">
                        {player.status === 'ready' ? t('ready_tag') : t('pending_tag')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Minimum participants alert banner for creator and players (Recruiting phase only) */}
        {game.status === 'recruiting' && (
          <div
            id="participant-threshold-banner"
            className={`mt-4 p-3 rounded-lg border font-mono text-xs flex items-center justify-between gap-3 ${
              game.players.length >= 3
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-neutral-950/70 border-neutral-800 text-neutral-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  game.players.length >= 3 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
              <span>
                {game.players.length >= 3 ? (
                  isHost
                    ? t('launch_condition_met', { count: game.players.length })
                    : t('launch_condition_waiting', { count: game.players.length })
                ) : (
                  t('recruitment_in_progress', {
                    count: game.players.length,
                    needed: 3 - game.players.length,
                  })
                )}
              </span>
            </div>

            {game.players.length < 3 && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="shrink-0 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>{t('invite_recruits')}</span>
              </button>
            )}
          </div>
        )}

        {/* Lobby Actions */}
        {game.status === 'recruiting' && (
          <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              id="btn-toggle-my-ready"
              type="button"
              onClick={handleToggleReady}
              className="w-full sm:w-auto py-2 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              {t('toggle_ready_btn')}
            </button>

            {isHost ? (
              <div className="w-full sm:w-auto flex flex-col items-end gap-1">
                <button
                  id="btn-launch-operation"
                  type="button"
                  onClick={handleLaunchGame}
                  disabled={game.players.length < 3}
                  className={`w-full sm:w-auto py-2.5 px-6 rounded-lg font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    game.players.length >= 3
                      ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 shadow-emerald-950/50'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-750 opacity-60 cursor-not-allowed'
                  }`}
                  title={
                    game.players.length < 3
                      ? t('start_game_requires', { count: game.players.length })
                      : t('start_game_button', {
                          count: game.players.length,
                          spies: getSpyCount(game.players.length),
                          spyLabel: getSpyCount(game.players.length) === 1 ? t('spy_singular') : t('spies_plural'),
                        })
                  }
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {game.players.length >= 3
                      ? t('start_game_button', {
                          count: game.players.length,
                          spies: getSpyCount(game.players.length),
                          spyLabel: getSpyCount(game.players.length) === 1 ? t('spy_singular') : t('spies_plural'),
                        })
                      : t('start_game_requires', { count: game.players.length })}
                  </span>
                </button>
                {game.players.length < 3 && (
                  <span className="text-[10px] font-mono text-neutral-500">
                    {t('creator_can_start_hint')}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                <span>
                  {game.players.length >= 3
                    ? t('awaiting_commander_start', { count: game.players.length })
                    : t('awaiting_more_players', { count: game.players.length })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          game={game}
          onClose={() => setShowInviteModal(false)}
          onOperativeAdded={() => {
            const updated = togglePlayerReady(game.id, currentUser.username);
            if (updated) onGameUpdated(updated);
          }}
        />
      )}

      {/* Locations Guide Modal */}
      {showLocationsGuide && (
        <LocationsGuideModal
          isSpy={isSpy && game.status === 'active'}
          onClose={() => setShowLocationsGuide(false)}
          onGuessLocation={handleSpyGuessLocation}
        />
      )}
    </div>
  );
};
