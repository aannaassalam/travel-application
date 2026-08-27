import Constants from "expo-constants";

/**
 * Turn an image path from the API into something the app can actually load.
 *
 * The catalogue stores two kinds of value: absolute URLs for uploaded media
 * (S3), and root-relative paths like `/img/banner-1.svg` for the placeholder
 * artwork that ships with the website. A browser resolves the second against
 * the page origin without being asked; a native app has no origin, so those
 * paths silently render nothing — which is exactly what a blank hero over a
 * grey rectangle is.
 *
 * SVG is dropped rather than passed through: `expo-image` cannot decode it
 * without an extra native decoder, and a broken image is worse than a clean
 * placeholder the card already styles for.
 */
const API_BASE =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  "http://localhost:3001/api/v1";

/** The site origin, derived from the API base by dropping the `/api/v1` tail. */
const ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/, "");

export function mediaUrl(src?: string): string | undefined {
  if (!src) return undefined;
  if (/\.svgz?($|\?)/i.test(src)) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  return `${ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** First usable image in a gallery, skipping anything we cannot decode. */
export const firstMedia = (images?: string[]): string | undefined =>
  (images ?? []).map(mediaUrl).find(Boolean);
