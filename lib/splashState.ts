import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the splash has begun revealing the app.
 *
 * Content entrances gate on this: they play at first mount too — hidden
 * behind the splash plate — and were finished by the time it lifted, so the
 * first thing anyone saw was a page standing still. Holding them until the
 * plate starts to rise means the app's first visible frame is an arrival.
 */

let revealed = false;
const listeners = new Set<() => void>();

export function markSplashRevealed() {
  if (revealed) return;
  revealed = true;
  listeners.forEach((l) => l());
}

export function useSplashRevealed(): boolean {
  return useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => revealed
  );
}

/**
 * Whether the splash has fully left the screen.
 *
 * Data-heavy content gates on THIS, not on the reveal: queries resolve
 * mid-splash, and mounting thirty cards plus decoding their photographs while
 * the cab is mid-drive is a Fabric commit storm landing on the animation's
 * thread — measured on-device as the drive hitching. Skeletons render behind
 * the splash; the real cards mount once nothing is animating over them.
 */
let complete = false;
const completeListeners = new Set<() => void>();

export function markSplashComplete() {
  if (complete) return;
  complete = true;
  completeListeners.forEach((l) => l());
}

export function useSplashComplete(): boolean {
  return useSyncExternalStore(
    useCallback((cb) => {
      completeListeners.add(cb);
      return () => completeListeners.delete(cb);
    }, []),
    () => complete
  );
}
