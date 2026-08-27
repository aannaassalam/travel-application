/**
 * The design system, ported 1:1 from the website's `styles/globals.css`.
 *
 * Every value here has a counterpart in the web `@theme` block. That is the
 * point: a customer who books a hotel on the site and opens the app the next
 * day should not feel they have moved to a different company. Where the two
 * genuinely must differ — touch targets, safe areas, platform motion — the
 * difference is noted at the value rather than left to drift.
 *
 * Kept as plain objects rather than a styling library: React Native has no
 * cascade, so a token file and `StyleSheet.create` is the whole system. A
 * runtime CSS-in-JS layer would buy theming we do not need and cost a render.
 */

/** §11.6 brand palette. Navy and white dominate; amber is the CTA and nothing else. */
export const color = {
  brand900: "#0a2540",
  brand800: "#0e2f4f",
  brand700: "#123a5f",
  brand600: "#17497a",
  brand500: "#1e5a8e",
  brand400: "#3f7fb0",
  brand100: "#dbe7f2",
  brand50: "#f1f6fb",

  accent700: "#b87513",
  accent600: "#d9911a",
  accent500: "#f5a623",
  accent100: "#fdf0d9",

  /** Availability and "in stock" signals; never a call to action. */
  teal700: "#0d5c63",
  teal600: "#12787f",
  teal500: "#199aa1",
  teal400: "#3fb9be",
  teal100: "#dcf1f2",

  /**
   * Warm neutrals, not cold greys. Paper at #FBFAF8 with pure-white cards reads
   * as considered; the same layout on #FFFFFF with grey borders reads as a
   * wireframe. Cheapest premium signal in the system.
   */
  ink900: "#14161a",
  ink700: "#3d4249",
  ink500: "#6c7076",
  ink300: "#a5a7ac",
  ink200: "#d6d3cc",
  ink100: "#e7e4dd",
  ink50: "#f4f2ed",
  paper: "#fbfaf8",
  white: "#ffffff",

  ok600: "#1f7a4d",
  ok100: "#e2f2e8",
  warn600: "#9a6608",
  warn100: "#fbeed6",
  bad600: "#b02f24",
  bad100: "#f9e6e3"
} as const;

/** Per-vertical tint, used only on the small category chip. */
export const verticalColor: Record<string, string> = {
  FLIGHT: "#1e5a8e",
  HOTEL: "#12787f",
  BUS: "#7c4d8f",
  CAR: "#b5622e",
  ACTIVITY: "#2f7a52",
  PROPERTY: "#8a5a2b",
  RESTAURANT: "#a8442f"
};

/**
 * 8-point grid. The odd steps exist for optical nudges inside a component
 * (icon beside text), never for layout — layout uses the even steps only.
 */
export const space = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  xl2: 20,
  xl3: 28,
  full: 999
} as const;

/**
 * Type scale, matching the web's named steps. Sizes are in points rather than
 * rem; React Native has no root font size, so the conversion is 1rem = 16pt.
 *
 * `allowFontScaling` stays on by default across the app so these follow the
 * reader's Dynamic Type setting — the point sizes are the 100% baseline, not a
 * ceiling. Anything that must not grow says so at the call site.
 */
export const type = {
  "2xs": { fontSize: 11, lineHeight: 16 },
  xs: { fontSize: 12, lineHeight: 18 },
  sm: { fontSize: 14, lineHeight: 22 },
  base: { fontSize: 15, lineHeight: 24 },
  md: { fontSize: 17, lineHeight: 26 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 30 },
  "2xl": { fontSize: 30, lineHeight: 34 },
  "3xl": { fontSize: 38, lineHeight: 42 }
} as const;

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  /** Editorial serif, display type only — never body copy. */
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold"
} as const;

/**
 * Elevation. Layered and low-opacity on iOS; Android gets an `elevation` value
 * because it ignores shadow offsets entirely and would otherwise render flat.
 */
export const shadow = {
  xs: {
    shadowColor: "#14161a",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  sm: {
    shadowColor: "#14161a",
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2
  },
  md: {
    shadowColor: "#14161a",
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  lg: {
    shadowColor: "#14161a",
    shadowOpacity: 0.14,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12
  },
  xl: {
    shadowColor: "#0a2540",
    shadowOpacity: 0.26,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 28 },
    elevation: 20
  }
} as const;

/**
 * Motion.
 *
 * `press` is deliberately faster than `color`: a press is immediate feedback
 * and belongs in the 100–150ms band, while colour can take its time because
 * nothing is waiting on it. Same reasoning, and the same numbers, as the web.
 */
export const motion = {
  press: 120,
  color: 220,
  enter: 320,
  sheet: 380,
  /** The splash is the one authored moment; it gets a longer budget. */
  splash: 1500
} as const;

/** iOS HIG minimum for a tappable control, and the floor for every button here. */
export const HIT_SLOP_MIN = 44;
