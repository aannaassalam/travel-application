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
