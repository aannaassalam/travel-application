/**
 * Where the app points.
 *
 * Dev talks to the machine running `travel-backend` — the iOS Simulator shares
 * the host's localhost. A physical device cannot: point this at the LAN
 * address the API listens on. Release builds go to production.
 */
export const API_BASE = __DEV__
  ? "http://localhost:3001/api/v1"
  : "https://backend.flexiairbnb.com/api/v1";

/** The website, for the "view on the site" escape hatches. */
export const SITE_ORIGIN = "https://flexiairbnb.com";
