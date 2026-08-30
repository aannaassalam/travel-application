import { useCallback, useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Reduce Motion, read once and cached.
 *
 * Every Reveal used to ask the native side itself — on Explore that was ~60
 * async round-trips landing as a burst of JS callbacks exactly when the screen
 * was trying to paint its first frame. It is a device setting: one read at
 * startup, one subscription for changes, and everyone else reads a boolean.
 */

let reduced = false;
const listeners = new Set<() => void>();

void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  reduced = v;
  listeners.forEach((l) => l());
});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
  reduced = v;
  listeners.forEach((l) => l());
});

/** Synchronous snapshot — safe inside effects that must not await. */
export const isReduceMotion = () => reduced;

export function useReduceMotion(): boolean {
  return useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => reduced
  );
}
