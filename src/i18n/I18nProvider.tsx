import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Locale, translations, TranslationKey } from './index';

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'fr',
  t: (key) => translations.fr[key],
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('tomboard_locale');
    return (stored === 'en' || stored === 'fr') ? stored : 'fr';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem('tomboard_locale', newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale][key] ?? translations.fr[key] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
