import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate } from "@/lib/i18n";
import type { Currency, Locale, Localized } from "@/types/domain";

/**
 * Locale and currency, remembered across launches.
 *
 * French and USD are the defaults, matching the website — §14 forbids
 * auto-detecting from IP without an obvious persistent override, and the device
 * locale is no better a guess for a Congolese customer travelling abroad.
 */

const KEY = "flexi.prefs";

interface Prefs {
  locale: Locale;
  currency: Currency;
  ready: boolean;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string) => string;
  lz: (value: Localized | undefined) => string;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Prefs>;
        if (saved.locale) setLocaleState(saved.locale);
        if (saved.currency) setCurrencyState(saved.currency);
      })
      .catch(() => {
        /* corrupt or unavailable storage just means defaults */
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: { locale?: Locale; currency?: Currency }) => {
    AsyncStorage.getItem(KEY)
      .then((raw) => AsyncStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(raw || "{}"), ...next })))
      .catch(() => {});
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      persist({ locale: l });
    },
    [persist]
  );

  const setCurrency = useCallback(
    (c: Currency) => {
      setCurrencyState(c);
      persist({ currency: c });
    },
    [persist]
  );

  const value = useMemo<Prefs>(
    () => ({
      locale,
      currency,
      ready,
      setLocale,
      setCurrency,
      t: (key: string) => translate(locale, key),
      lz: (v?: Localized) => v?.[locale] || v?.fr || v?.en || ""
    }),
    [locale, currency, ready, setLocale, setCurrency]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
