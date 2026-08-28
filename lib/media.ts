import { API_BASE } from "@/lib/config";

/**
 * Turn an image path from the API into something the app can actually load.
 *
 * The catalogue stores two kinds of value: absolute URLs for uploaded media
 * (S3), and root-relative paths like `/img/banner-1.svg` for the placeholder
 * artwork that ships with the website. A browser resolves the second against
 * the page origin without being asked; a native app has no origin, so those
 * paths silently render nothing.
 *
 * SVG is dropped rather than passed through: the native image pipeline cannot
 * decode it, and a broken image is worse than the styled fallback every card
 * carries.
 */
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

/** RN Image wants a number for bundled assets and {uri} for remote ones. */
export const toSource = (src?: string | number) =>
  typeof src === "number" ? src : src ? { uri: src } : undefined;
