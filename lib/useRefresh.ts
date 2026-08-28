import { useCallback, useRef, useState } from "react";

/**
 * Pull-to-refresh state with a floor on how long the spinner stays.
 *
 * Against a fast API the refetch resolves in tens of milliseconds; tied
 * directly to `isRefetching` the spinner disappears the frame the finger
 * lifts, which reads as "nothing happened". A ~700ms floor is long enough to
 * see and short enough to never feel slow — the data itself still lands as
 * fast as the network allows.
 */
export function useRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const fn = useRef(refetch);
  fn.current = refetch;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const started = Date.now();
    try {
      await fn.current();
    } finally {
      const remaining = 700 - (Date.now() - started);
      if (remaining > 0) await new Promise<void>((r) => setTimeout(r, remaining));
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}
