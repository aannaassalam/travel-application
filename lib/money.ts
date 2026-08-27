import type { Currency, Money } from "@/types/domain";

/**
 * Money, ported from the website's `lib/money.ts`.
 *
 * The rule that matters: a converted figure is never presented as the charge.
 * If the administrator typed a price in the requested currency we show it; if
 * not we fall back to the USD base and mark it approximate with a leading `≈`,
 * so nobody is ever quoted a number they cannot actually be charged.
 */

/** CDF has no minor unit in practice — prices are whole francs. */
export const MINOR_EXPONENT: Record<Currency, number> = { USD: 2, CDF: 0, EUR: 2 };

/** Indicative only, and used ONLY to render the `≈` fallback. Never to charge. */
const FX: Record<Currency, number> = { USD: 1, CDF: 28, EUR: 0.92 };

export const baseMinor = (money: Money | number | undefined): number =>
  typeof money === "number" ? money : (money?.USD ?? 0);

export function resolve(
  money: Money | number | undefined,
  currency: Currency
): { minor: number; exact: boolean } {
  if (typeof money === "number") return { minor: money, exact: currency === "USD" };
  const typed = money?.[currency];
  if (typeof typed === "number") return { minor: typed, exact: true };
  const usd = money?.USD ?? 0;
  const scale = 10 ** (MINOR_EXPONENT[currency] - MINOR_EXPONENT.USD);
  return { minor: Math.round(usd * FX[currency] * scale), exact: false };
}

export function formatMoney(minor: number, currency: Currency, locale = "fr"): string {
  const major = minor / 10 ** MINOR_EXPONENT[currency];
  try {
    return new Intl.NumberFormat(locale === "fr" ? "fr-CD" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: MINOR_EXPONENT[currency],
      minimumFractionDigits: 0
    }).format(major);
  } catch {
    // Older Hermes builds ship a partial ICU; a readable number beats a throw.
    return `${currency} ${major.toLocaleString()}`;
  }
}

export function price(
  money: Money | number | undefined,
  currency: Currency,
  locale = "fr"
): string {
  const { minor, exact } = resolve(money, currency);
  const text = formatMoney(minor, currency, locale);
  return exact ? text : `≈ ${text}`;
}

export function multiply(money: Money | number | undefined, factor: number): Money {
  if (typeof money === "number") return { USD: money * factor };
  const out: Money = {};
  for (const [k, v] of Object.entries(money ?? {})) {
    if (typeof v === "number") out[k as Currency] = v * factor;
  }
  return out;
}

/** Sum, keeping only currencies EVERY part carries a real typed price in. */
export function sumMoney(parts: (Money | undefined)[]): Money {
  const real = parts.filter(Boolean) as Money[];
  if (!real.length) return { USD: 0 };
  const shared = (Object.keys(real[0]) as Currency[]).filter((c) =>
    real.every((m) => typeof m[c] === "number")
  );
  const out: Money = {};
  for (const c of shared) out[c] = real.reduce((s, m) => s + (m[c] ?? 0), 0);
  return Object.keys(out).length ? out : { USD: 0 };
}
