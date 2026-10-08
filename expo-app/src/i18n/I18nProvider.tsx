import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setRequestLocale } from '@/api/client';
import { meApi } from '@/api/endpoints';
import type { Locale, Place } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { type Replacements, translate } from './translate';

export const LOCALE_KEY = 'spynet.locale';


interface I18nValue {
  locale: Locale;
  /** English strings are their own keys; `:name` placeholders are replaced. */
  t(key: string, replace?: Replacements): string;
  /** A location's name in the current language. */
  place(value: Place | null | undefined): string;
  setLocale(next: Locale): Promise<void>;
}


function deviceLocale(): Locale {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('uk') ? 'uk' : 'en';
  } catch {
    return 'en';
  }
}

// Without a provider (e.g. isolated component tests) the app speaks English.
const I18nContext = createContext<I18nValue>({
  locale: 'en',
  t: (key, replace) => translate('en', key, replace),
  place: (value) => value?.en ?? '',
  setLocale: async () => {},
});

/**
 * The account's saved language wins once signed in, so it follows the user
 * between the web app and phones (and drives their push notifications); a
 * guest's choice is kept on the device, defaulting to the device language.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { state, setUser } = useAuth();
  const [deviceChoice, setDeviceChoice] = useState<Locale>(deviceLocale);
  const accountLocale = state.status === 'signedIn' ? state.user.locale : undefined;
  const locale = accountLocale ?? deviceChoice;

  useEffect(() => {
    void SecureStore.getItemAsync(LOCALE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'uk') setDeviceChoice(saved);
    });
  }, []);

  useEffect(() => setRequestLocale(locale), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      setDeviceChoice(next);
      await SecureStore.setItemAsync(LOCALE_KEY, next);
      if (state.status === 'signedIn') {
        setUser({ ...state.user, locale: next });
        setUser(await meApi.updateLocale(next));
      }
    },
    [state, setUser],
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: (key, replace) => translate(locale, key, replace),
      place: (value) => (value ? value[locale] : ''),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
