import { trigger } from "react-native-haptic-feedback";

/**
 * One seam over the haptics library, mirroring the gestures the app actually
 * uses. A touch screen gives no travel and no click, so the impact IS the
 * confirmation — without it people tap twice and order twice.
 *
 * The impacts answer a touch; the notifications answer an OUTCOME, and only an
 * outcome worth feeling — an order placed, a payment refused. Firing those on
 * anything smaller is how a phone stops being trusted and starts being muted.
 */
const opts = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

export const haptic = {
  light: () => trigger("impactLight", opts),
  medium: () => trigger("impactMedium", opts),
  selection: () => trigger("selection", opts),
  success: () => trigger("notificationSuccess", opts),
  warning: () => trigger("notificationWarning", opts),
  error: () => trigger("notificationError", opts)
};
