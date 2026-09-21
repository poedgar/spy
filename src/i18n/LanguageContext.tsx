import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LanguageContextType } from './types.ts';
import { TRANSLATIONS, TranslationKey } from './translations.ts';
import { Globe } from 'lucide-react';

const STORAGE_KEY = 'spynet_language_preference';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'uk') {
        return saved;
      }
      // Check browser language
      if (navigator.language.startsWith('uk')) {
        return 'uk';
      }
    } catch {
      // fallback
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let translation = (dict as Record<string, string>)[key] || (TRANSLATIONS.en as Record<string, string>)[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      id="language-switcher-group"
      className={`inline-flex items-center p-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono ${className}`}
    >
      <button
        id="btn-lang-en"
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
          language === 'en'
            ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title="Switch to English"
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        id="btn-lang-uk"
        type="button"
        onClick={() => setLanguage('uk')}
        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
          language === 'uk'
            ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title="Перемкнути на українську мову"
      >
        <span>🇺🇦</span>
        <span>UK (УКР)</span>
      </button>
    </div>
  );
};
