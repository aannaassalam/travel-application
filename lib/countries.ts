/**
 * Dialling codes offered by the phone field.
 *
 * Not every country on earth: this is a DRC travel business, so the list is the
 * DRC plus its neighbours, the diaspora destinations customers actually call
 * from, and the handful of hubs the flights connect through. A 200-entry
 * dropdown is slower to use than typing, which defeats the point.
 *
 * `digits` is how many national digits the number has AFTER any trunk zero, so
 * the field can tell someone their number is short before the SMS is wasted.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, used as the stable option value. */
  code: string;
  name: string;
  /** Dialling prefix, with the plus. */
  dial: string;
  flag: string;
  digits: [number, number];
}

export const COUNTRIES: Country[] = [
  { code: "CD", name: "RD Congo", dial: "+243", flag: "\u{1F1E8}\u{1F1E9}", digits: [9, 9] },
  { code: "CG", name: "Congo-Brazzaville", dial: "+242", flag: "\u{1F1E8}\u{1F1EC}", digits: [9, 9] },
  { code: "AO", name: "Angola", dial: "+244", flag: "\u{1F1E6}\u{1F1F4}", digits: [9, 9] },
  { code: "RW", name: "Rwanda", dial: "+250", flag: "\u{1F1F7}\u{1F1FC}", digits: [9, 9] },
  { code: "BI", name: "Burundi", dial: "+257", flag: "\u{1F1E7}\u{1F1EE}", digits: [8, 8] },
  { code: "UG", name: "Uganda", dial: "+256", flag: "\u{1F1FA}\u{1F1EC}", digits: [9, 9] },
  { code: "TZ", name: "Tanzania", dial: "+255", flag: "\u{1F1F9}\u{1F1FF}", digits: [9, 9] },
  { code: "KE", name: "Kenya", dial: "+254", flag: "\u{1F1F0}\u{1F1EA}", digits: [9, 9] },
  { code: "ZM", name: "Zambia", dial: "+260", flag: "\u{1F1FF}\u{1F1F2}", digits: [9, 9] },
  { code: "CF", name: "Centrafrique", dial: "+236", flag: "\u{1F1E8}\u{1F1EB}", digits: [8, 8] },
  { code: "SS", name: "South Sudan", dial: "+211", flag: "\u{1F1F8}\u{1F1F8}", digits: [9, 9] },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "\u{1F1FF}\u{1F1E6}", digits: [9, 9] },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "\u{1F1F3}\u{1F1EC}", digits: [10, 10] },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "\u{1F1E8}\u{1F1F2}", digits: [9, 9] },
  { code: "BE", name: "Belgique", dial: "+32", flag: "\u{1F1E7}\u{1F1EA}", digits: [9, 9] },
  { code: "FR", name: "France", dial: "+33", flag: "\u{1F1EB}\u{1F1F7}", digits: [9, 9] },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "\u{1F1EC}\u{1F1E7}", digits: [10, 10] },
  { code: "US", name: "United States", dial: "+1", flag: "\u{1F1FA}\u{1F1F8}", digits: [10, 10] },
  { code: "CA", name: "Canada", dial: "+1", flag: "\u{1F1E8}\u{1F1E6}", digits: [10, 10] },
  { code: "AE", name: "UAE", dial: "+971", flag: "\u{1F1E6}\u{1F1EA}", digits: [9, 9] },
  { code: "IN", name: "India", dial: "+91", flag: "\u{1F1EE}\u{1F1F3}", digits: [10, 10] },
  { code: "CN", name: "China", dial: "+86", flag: "\u{1F1E8}\u{1F1F3}", digits: [11, 11] },
  { code: "TR", name: "Türkiye", dial: "+90", flag: "\u{1F1F9}\u{1F1F7}", digits: [10, 10] },
];

/** The office is in Kinshasa, so this is the overwhelmingly common case. */
export const DEFAULT_COUNTRY = COUNTRIES[0];

export const findCountry = (code: string) =>
  COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;

/**
 * Builds E.164 from a country and the national part.
 *
 * The leading trunk zero is stripped: people write their own number the way
 * they dial it locally ("081..."), and pasting that after a dial code produces
 * a number that does not exist.
 */
export function toE164(country: Country, national: string): string | null {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const [min, max] = country.digits;
  if (digits.length < min || digits.length > max) return null;
  return `${country.dial}${digits}`;
}

/** Splits a stored E.164 back into a country and its national part. */
export function fromE164(value?: string | null): { country: Country; national: string } {
  if (!value?.startsWith("+")) return { country: DEFAULT_COUNTRY, national: "" };
  // Longest prefix first, so +1 never wins over a +1xx style code.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => value.startsWith(c.dial));
  if (!match) return { country: DEFAULT_COUNTRY, national: value.replace(/^\+/, "") };
  return { country: match, national: value.slice(match.dial.length) };
}
