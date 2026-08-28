import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Favourites, the website's model: slugs only, resolved live against the API
 * when displayed — a saved item always shows today's price, never a snapshot.
 *
 * Held in memory behind a tiny store so every heart on screen updates the
 * moment one is tapped, and persisted to AsyncStorage behind the scenes.
 */

const KEY = "flexi.saved";

let slugs: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      slugs = JSON.parse(raw);
      emit();
    }
  } catch {
    /* an unreadable store is an empty one */
  }
}
void load();

export const getSavedSlugs = () => slugs;

export function toggleSaved(slug: string) {
  slugs = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [slug, ...slugs];
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(slugs)).catch(() => {});
}

/** Reactive list of saved slugs; re-renders on any toggle anywhere. */
export function useSaved(): string[] {
  return useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    getSavedSlugs
  );
}
