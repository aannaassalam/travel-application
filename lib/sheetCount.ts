import { useCallback, useSyncExternalStore } from "react";

/**
 * How many bottom sheets are open right now, app-wide.
 *
 * The floating tab bar subscribes to this and steps aside while any sheet is
 * up: a sheet is a focused sub-task, and a navigation pill hovering over its
 * footer button is chrome barging into the conversation.
 */

let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function sheetOpened() {
  count += 1;
  emit();
}

export function sheetClosed() {
  count = Math.max(count - 1, 0);
  emit();
}

export function useSheetsOpen(): boolean {
  return useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => count > 0
  );
}
