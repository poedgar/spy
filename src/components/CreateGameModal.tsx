import React, { useState } from 'react';
import { AuthUser, GameMode, SpyGame } from '../types.ts';
import { createNewSpyGame, getSpyCount } from '../utils/gameStorage.ts';
import { getRandomLocation } from '../data/locations.ts';
import {
  X,
  Shield,
  Shuffle,
  Users,
  MapPin,
  FileText,
  Radio,
  KeyRound,
  ArrowRight,
  Database,
} from 'lucide-react';

interface CreateGameModalProps {
  user: AuthUser;
  onClose: () => void;
  onGameCreated: (game: SpyGame) => void;
}

const CODENAME_PRESETS = [
  'Operation Blackout',
  'Project Chimera',
  'Vanguard Protocol',
  'Ghost Whisper',
  'Cipher Paradox',
  'Shadow Infiltration',
  'Sector Zero Intercept',
  'Operation Midnight Sun',
];

const LOCATION_PRESETS = [
  'Berlin Embassy - Safehouse Beta',
  'Geneva Nuclear Summit',
  'Underground Submarine Base 44',
  'Monaco Casino Vault',
  'Trans-Siberian Express Car 07',
  'Orbital Satellite Uplink Station',
];

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  user,
  onClose,
  onGameCreated,
}) => {
  const [title, setTitle] = useState(
    CODENAME_PRESETS[Math.floor(Math.random() * CODENAME_PRESETS.length)]
  );
  const [gameMode, setGameMode] = useState<GameMode>('mole');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [secretLocation, setSecretLocation] = useState(getRandomLocation());
  const [briefing, setBriefing] = useState(
    'A rogue operative has intercepted intelligence files. Question operatives to catch the Spy without revealing our location.'
  );

  const handleRandomize = () => {
    setTitle(CODENAME_PRESETS[Math.floor(Math.random() * CODENAME_PRESETS.length)]);
    setSecretLocation(getRandomLocation());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGame = createNewSpyGame(
      user,
      title,
      gameMode,
      maxPlayers,
      secretLocation,
      briefing
    );
    onGameCreated(newGame);
  };

  return (
    <div
      id="create-game-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="create-game-modal-card"
        className="w-full max-w-lg bg-neutral-900 border border-emerald-500/40 rounded-xl p-6 shadow-2xl text-neutral-100 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          id="btn-close-create-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
              MISSION INITIALIZATION
            </span>
            <h3 className="text-lg font-bold text-white">Create New Spy Operation</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operation Codename */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-medium text-neutral-300">
                OPERATION CODENAME
              </label>
              <button
                type="button"
                onClick={handleRandomize}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3 h-3" />
                <span>Randomize</span>
              </button>
            </div>
            <input
              id="input-game-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operation Nightfall"
              className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 font-mono outline-none"
            />
          </div>

          {/* Game Mode Selection */}
          <div>
            <label className="block text-xs font-mono font-medium text-neutral-300 mb-2">
              GAME MODE // OBJECTIVE
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGameMode('mole')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  gameMode === 'mole'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs font-mono text-emerald-300">The Mole</span>
                  <Radio className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Uncover the covert infiltrator before the sector is leaked.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('codebreaker')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  gameMode === 'codebreaker'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs font-mono text-emerald-300">Codebreaker</span>
                  <KeyRound className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Decrypt ciphers under high-pressure timer constraints.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('counterintel')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  gameMode === 'counterintel'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs font-mono text-emerald-300">Counter-Intel</span>
                  <Shield className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Neutralize intercepted bugs and secure classified drops.
                </p>
              </button>
            </div>
          </div>

          {/* Max Players */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-mono font-medium text-neutral-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                OPERATIVE CAPACITY: <span className="text-emerald-400 font-bold">{maxPlayers} Agents</span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                &rarr; {getSpyCount(maxPlayers)} {getSpyCount(maxPlayers) === 1 ? 'Spy' : 'Spies'} at capacity
              </span>
            </div>
            <input
              id="range-max-players"
              type="range"
              min={3}
              max={12}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
              <span>Min: 3 (1 Spy)</span>
              <span>5-7 (2 Spies)</span>
              <span>8-10 (3 Spies)</span>
              <span>12 (4 Spies)</span>
            </div>
          </div>

          {/* 500 Locations Pool Intel Information */}
          <div className="p-3 bg-neutral-950/90 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-emerald-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                500 LOCATIONS DATABASE
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                Automated Selection
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
              When the game starts (minimum 3 participants), 1 secret location is randomly selected from 500 pre-existing locations (Church, Palace, Castle, School, etc.). All loyal operatives receive this location; undercover Spies do not receive any location.
            </p>
            <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-2 pt-1 border-t border-neutral-850">
              <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
              <span>Teaser Preview: <strong className="text-neutral-300">{secretLocation}</strong></span>
            </div>
          </div>

          {/* Mission Briefing */}
          <div>
            <label className="block text-xs font-mono font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              MISSION BRIEFING
            </label>
            <textarea
              id="textarea-briefing"
              rows={2}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-600 font-mono outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              id="btn-confirm-create-game"
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <span>Initialize Operation &amp; Generate Link</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
