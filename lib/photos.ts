/**
 * The city photo library, bundled.
 *
 * These are the same photographs the website's destination tiles use. Bundling
 * them means the home screen has real imagery on first launch, offline, on a
 * metered connection — and gives venues in a known city an honest ambient
 * fallback while the catalogue's own photos are still placeholders.
 */
const PHOTOS: Record<string, number> = {
  kinshasa: require("@/assets/images/photos/kinshasa.jpg"),
  lubumbashi: require("@/assets/images/photos/lubumbashi.jpg"),
  goma: require("@/assets/images/photos/goma.jpg"),
  bukavu: require("@/assets/images/photos/bukavu.jpg"),
  kisangani: require("@/assets/images/photos/kisangani.jpg"),
  matadi: require("@/assets/images/photos/matadi.jpg")
};

/** Accent- and case-insensitive: "Kinshasa", "kinshasa", "KINSHASA" all hit. */
export function cityPhoto(city?: string): number | undefined {
  if (!city) return undefined;
  const key = city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return PHOTOS[key];
}

export const CITY_LIST = ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Matadi"];
