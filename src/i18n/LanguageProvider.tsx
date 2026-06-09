import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';

import { translations, type TKey } from '@/i18n/translations';
import type { Language } from '@/types';

const RTL_LANGS: Language[] = ['ar', 'ku'];
const STORAGE_KEY = 'souqna.lang';
const DEFAULT_LANG: Language = 'ar';

type Vars = Record<string, string | number>;

type LanguageContextValue = {
  lang: Language;
  isRTL: boolean;
  setLang: (lang: Language) => void;
  t: (key: TKey, vars?: Vars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return Object.keys(vars).reduce(
    (acc, key) => acc.replaceAll(`{${key}}`, String(vars[key])),
    template,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'ar' || stored === 'ku' || stored === 'en') {
        setLangState(stored);
      }
    });
  }, []);

  const isRTL = RTL_LANGS.includes(lang);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    } else if (I18nManager.isRTL !== isRTL) {
      // Native needs a reload for this to fully apply; we set it eagerly so a
      // restart picks up the correct direction.
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  }, [isRTL, lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      const value = translations[lang]?.[key] ?? translations.en[key] ?? key;
      return interpolate(value, vars);
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, isRTL, setLang, t }),
    [lang, isRTL, setLang, t],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useI18n() {
  const ctx = use(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}
