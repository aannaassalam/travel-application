import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getToken, me, setToken } from "@/lib/api";

/**
 * Who is signed in.
 *
 * The token lives in the keychain; this only tracks the customer it resolves
 * to. It is verified against the server on launch rather than trusted from
 * storage — a token can be expired, or revoked because the account was blocked,
 * and a UI that believes a stale one shows an account page that 401s on tap.
 */

export interface Customer {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface SessionCtx {
  customer: Customer | null;
  ready: boolean;
  signIn: (token: string, customer: Customer) => Promise<void>;
  signOut: () => Promise<void>;
  /** After a profile save: the server's copy replaces the local one. */
  update: (customer: Customer) => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return setReady(true);
      try {
        const { customer: c } = await me();
        setCustomer(c);
      } catch {
        // Expired or revoked. `request` has already cleared it.
        setCustomer(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (token: string, c: Customer) => {
    await setToken(token);
    setCustomer(c);
  }, []);

  const signOut = useCallback(async () => {
    await setToken(null);
    setCustomer(null);
  }, []);

  const update = useCallback((c: Customer) => setCustomer(c), []);

  const value = useMemo(
    () => ({ customer, ready, signIn, signOut, update }),
    [customer, ready, signIn, signOut, update]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
