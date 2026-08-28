import type { Locale } from "@/types/domain";

/**
 * Formatting, ported from the website's `lib/format.ts`. DRC conventions
 * (DD/MM, space thousands, comma decimal) come free from fr-FR; timestamps
 * are ISO 8601 with offset because the country spans UTC+1 and UTC+2.
 */

const tag = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");

export const fmtDate = (iso: string, locale: Locale = "fr") => {
  try {
    return new Intl.DateTimeFormat(tag(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

export const fmtTime = (iso: string, locale: Locale = "fr") => {
  try {
    return new Intl.DateTimeFormat(tag(locale), {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
};

export const fmtDateTime = (iso: string, locale: Locale = "fr") =>
  `${fmtDate(iso, locale)} · ${fmtTime(iso, locale)}`;

/** "2 h 35" / "2h 35m" from two ISO instants. */
export const durationBetween = (from: string, to: string, locale: Locale = "fr") =>
  formatMinutes(Math.round((+new Date(to) - +new Date(from)) / 60000), locale);

export function formatMinutes(total: number, locale: Locale = "fr") {
  const days = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (days) parts.push(locale === "fr" ? `${days} j` : `${days}d`);
  if (h) parts.push(locale === "fr" ? `${h} h` : `${h}h`);
  if (m) parts.push(locale === "fr" ? `${m} min` : `${m}m`);
  return parts.join(" ") || (locale === "fr" ? "0 min" : "0m");
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
