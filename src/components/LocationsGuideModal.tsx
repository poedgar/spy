import React, { useState, useMemo } from 'react';
import { X, Search, MapPin, Database, Check, Shield } from 'lucide-react';
import { SPY_LOCATIONS } from '../data/locations.ts';

interface LocationsGuideModalProps {
  onClose: () => void;
  isSpy?: boolean;
  onGuessLocation?: (location: string) => void;
}

export const LocationsGuideModal: React.FC<LocationsGuideModalProps> = ({
  onClose,
  isSpy = false,
  onGuessLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [guessSubmitted, setGuessSubmitted] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return SPY_LOCATIONS;
    const term = searchTerm.toLowerCase();
    return SPY_LOCATIONS.filter((loc) => loc.toLowerCase().includes(term));
  }, [searchTerm]);

  const handleConfirmGuess = () => {
    if (!selectedGuess) return;
    setGuessSubmitted(true);
    if (onGuessLocation) {
      onGuessLocation(selectedGuess);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 pr-8">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                CLASSIFIED SECTOR REPOSITORY
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                500 Verified Places
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-mono">
              Locations Reference Database
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
          {isSpy ? (
            <span className="text-red-300">
              <strong>Spy Intelligence:</strong> All loyal operatives are stationed at one of these 500 locations. Use this database to deduce which location they are discussing, or formulate your secret guess.
            </span>
          ) : (
            <span>
              All 500 pre-existing locations in the surveillance network. Loyal operatives share one randomly selected location; undercover spies do not know which one was chosen.
            </span>
          )}
        </p>

        {/* Search Bar */}
        <div className="relative mb-3 shrink-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search through 500 locations (e.g. Castle, School, Submarine, Church)..."
            className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-neutral-500 outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500 hover:text-neutral-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count notification */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2 px-1 shrink-0">
          <span>Showing {filteredLocations.length} of 500 locations</span>
          {isSpy && selectedGuess && (
            <span className="text-red-400 font-semibold">
              Selected Guess: {selectedGuess}
            </span>
          )}
        </div>

        {/* Scrollable Locations Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 min-h-48">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredLocations.map((loc) => {
              const isSelected = selectedGuess === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    if (isSpy) setSelectedGuess(loc);
                  }}
                  className={`text-left p-2 rounded text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/80 border border-red-500 text-red-200 shadow-sm'
                      : 'bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800/80 text-neutral-300 hover:text-white'
                  }`}
                  title={isSpy ? `Select ${loc} as your guess` : loc}
                >
                  <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? 'text-red-400' : 'text-neutral-500'}`} />
                  <span className="truncate">{loc}</span>
                </button>
              );
            })}
          </div>

          {filteredLocations.length === 0 && (
            <div className="py-12 text-center text-xs font-mono text-neutral-500">
              No matching locations found for &ldquo;{searchTerm}&rdquo;.
            </div>
          )}
        </div>

        {/* Spy Guess Action Footer */}
        {isSpy && onGuessLocation && (
          <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs font-mono text-neutral-400">
              {guessSubmitted ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Guess logged in session: <strong>{selectedGuess}</strong></span>
                </span>
              ) : (
                <span>Select a location above to submit your covert Spy deduction</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmGuess}
              disabled={!selectedGuess || guessSubmitted}
              className="w-full sm:w-auto py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{guessSubmitted ? 'Guess Submitted' : 'Submit Spy Guess'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-neutral-500 hover:text-neutral-300 underline underline-offset-2 cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
