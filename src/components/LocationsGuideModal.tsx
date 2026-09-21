import React, { useState, useMemo } from 'react';
import { X, Search, MapPin, Database, Check, Shield } from 'lucide-react';
import { SPY_LOCATIONS_DATA, searchLocations, SpyLocation, getLocationName } from '../data/locations.ts';
import { useLanguage } from '../i18n/LanguageContext.tsx';

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
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [guessSubmitted, setGuessSubmitted] = useState(false);

  const filteredLocations = useMemo(() => {
    return searchLocations(searchTerm);
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
      <div id="locations-guide-modal-card" className="relative w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          id="btn-close-locations-guide"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          title={t('close_guide')}
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
                {t('sector_repository')}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {t('verified_places', { count: 500 })}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span>{t('locations_ref_db')}</span>
              <span className="text-xs text-neutral-400 font-normal">
                ({language === 'uk' ? '500 перевірених місць' : '500 Pre-existing Locations Pool'})
              </span>
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
          {isSpy ? (
            <span className="text-red-300">
              <strong>{t('spy_intel_title')}</strong> {t('spy_intel_desc')}
            </span>
          ) : (
            <span>
              {t('loyal_intel_desc')}
            </span>
          )}
        </p>

        {/* Search Bar */}
        <div className="relative mb-3 shrink-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-locations"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_locations_placeholder')}
            className="w-full bg-neutral-950 border border-neutral-750 focus:border-emerald-500 rounded-lg pl-9 pr-14 py-2 text-xs font-mono text-white placeholder-neutral-500 outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500 hover:text-neutral-300 cursor-pointer"
            >
              {t('clear')}
            </button>
          )}
        </div>

        {/* Count notification */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2 px-1 shrink-0">
          <span>{t('showing_locations', { count: filteredLocations.length, total: 500 })}</span>
          {isSpy && selectedGuess && (
            <span className="text-red-400 font-semibold truncate max-w-xs">
              {t('selected_guess_label')}: {language === 'uk' ? getLocationName(selectedGuess, 'uk') : selectedGuess}
            </span>
          )}
        </div>

        {/* Scrollable Locations Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3 min-h-48">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredLocations.map((item: SpyLocation) => {
              const primaryName = language === 'uk' ? item.uk : item.en;
              const secondaryName = language === 'uk' ? item.en : item.uk;
              const isSelected = selectedGuess === item.en || selectedGuess === item.uk;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isSpy) setSelectedGuess(language === 'uk' ? item.uk : item.en);
                  }}
                  className={`text-left p-2 rounded text-xs font-mono flex flex-col justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/80 border border-red-500 text-red-200 shadow-sm'
                      : 'bg-neutral-900/80 hover:bg-neutral-850 border border-neutral-800/80 text-neutral-300 hover:text-white'
                  }`}
                  title={isSpy ? `${t('select_as_guess')}: ${primaryName}` : `${primaryName} (${secondaryName})`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? 'text-red-400' : 'text-neutral-500'}`} />
                    <span className="truncate font-medium">{primaryName}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 truncate pl-4.5">
                    {secondaryName}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredLocations.length === 0 && (
            <div className="py-12 text-center text-xs font-mono text-neutral-500">
              {t('no_matching_locations', { term: searchTerm })}
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
                  <span>
                    {t('guess_logged')}: <strong>{selectedGuess}</strong>
                  </span>
                </span>
              ) : (
                <span>{t('select_above_submit')}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmGuess}
              disabled={!selectedGuess || guessSubmitted}
              className="w-full sm:w-auto py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{guessSubmitted ? t('guess_submitted_btn') : t('submit_spy_guess')}</span>
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
            {t('close_guide')}
          </button>
        </div>
      </div>
    </div>
  );
};
