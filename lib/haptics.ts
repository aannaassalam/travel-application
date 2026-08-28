import { trigger } from "react-native-haptic-feedback";

/**
 * One seam over the haptics library, mirroring the four gestures the app
 * actually uses. A touch screen gives no travel and no click, so the impact IS
 * the confirmation — without it people tap twice and order twice.
 */
const opts = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

export const haptic = {
  light: () => trigger("impactLight", opts),
  medium: () => trigger("impactMedium", opts),
  selection: () => trigger("selection", opts),
  warning: () => trigger("notificationWarning", opts)
};
