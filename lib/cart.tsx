import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sumMoney } from "@/lib/money";
import type { MenuItem, Money, Restaurant } from "@/types/domain";

/**
 * The restaurant basket, ported from the website's `lib/cart.tsx`.
 *
 * Two deliberate differences from the web version:
 *
 *   - Persistence is AsyncStorage rather than sessionStorage, and it survives
 *     the app being killed. A phone app is backgrounded constantly; losing a
 *     basket to the OS reclaiming memory would be the app's fault, not the
 *     customer's.
 *   - Adding fires a haptic. On a touch screen the tap has no travel and no
 *     click, so the impact IS the confirmation — without it people tap twice.
 */

const KEY = "flexi.cart";
const MAX_LINES = 10; // The API refuses more than 10 lines on one order.
const MAX_QTY = 20; // …and more than 20 of any one line.

export interface CartLine {
  menuItemId: string;
  name: string;
  /** Per-item, per-currency. Display only — the server re-prices at checkout. */
  unitPrice: Money;
  quantity: number;
  image?: string;
}

export interface CartState {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  lines: CartLine[];
}

const EMPTY: CartState = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  lines: []
};

interface Ctx extends CartState {
  ready: boolean;
  count: number;
  /** Food only — delivery is added by the server once a zone is chosen. */
  subtotal: Money;
  add: (item: MenuItem, restaurant: Restaurant) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  /** Set when `add` was called for a different kitchen and is awaiting an answer. */
  pending: { item: MenuItem; restaurant: Restaurant } | null;
  confirmReplace: () => void;
  cancelReplace: () => void;
}

const CartContext = createContext<Ctx | null>(null);

const lineOf = (item: MenuItem): CartLine => ({
  menuItemId: item.id,
  name: item.name.fr || item.name.en || "",
  unitPrice: item.sellPrice,
  quantity: 1,
  image: item.images?.[0]
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Ctx["pending"]>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: CartState) => {
    setState(next);
    if (next.lines.length) AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  /**
   * One basket, one kitchen.
   *
   * The API refuses an order spanning two restaurants — there is one driver and
   * one delivery fee — so letting the basket mix would only produce a failure
   * at the last step, after the customer had chosen everything.
   */
  const add = useCallback(
    (item: MenuItem, restaurant: Restaurant) => {
      if (state.restaurantId && state.restaurantId !== restaurant.id) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPending({ item, restaurant });
        return;
      }
      const existing = state.lines.find((l) => l.menuItemId === item.id);
      if (!existing && state.lines.length >= MAX_LINES) return;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      persist({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name.fr || restaurant.name.en || "",
        lines: existing
          ? state.lines.map((l) =>
              l.menuItemId === item.id
                ? { ...l, quantity: Math.min(l.quantity + 1, MAX_QTY) }
                : l
            )
          : [...state.lines, lineOf(item)]
      });
    },
    [state, persist]
  );

  const setQuantity = useCallback(
    (menuItemId: string, quantity: number) => {
      const q = Math.max(0, Math.min(Math.trunc(quantity), MAX_QTY));
      void Haptics.selectionAsync();
      // Zero removes rather than leaving a 0 line, which the API would refuse.
      const lines =
        q === 0
          ? state.lines.filter((l) => l.menuItemId !== menuItemId)
          : state.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: q } : l));
      persist(lines.length ? { ...state, lines } : EMPTY);
    },
    [state, persist]
  );

  const remove = useCallback((id: string) => setQuantity(id, 0), [setQuantity]);
  const clear = useCallback(() => persist(EMPTY), [persist]);

  const confirmReplace = useCallback(() => {
    if (!pending) return;
    const { item, restaurant } = pending;
    setPending(null);
    persist({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name.fr || restaurant.name.en || "",
      lines: [lineOf(item)]
    });
  }, [pending, persist]);

  const cancelReplace = useCallback(() => setPending(null), []);

  const count = useMemo(() => state.lines.reduce((n, l) => n + l.quantity, 0), [state.lines]);

  /**
   * Only currencies EVERY line carries a real typed price in. Summing a line
   * with no CDF price into a CDF subtotal would invent a total the customer can
   * never be charged — the same rule the server applies when it settles.
   */
  const subtotal = useMemo(
    () =>
      sumMoney(
        state.lines.map((l) => {
          const out: Money = {};
          for (const [c, v] of Object.entries(l.unitPrice)) {
            if (typeof v === "number") out[c as keyof Money] = v * l.quantity;
          }
          return out;
        })
      ),
    [state.lines]
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      count,
      subtotal,
      add,
      setQuantity,
      remove,
      clear,
      pending,
      confirmReplace,
      cancelReplace
    }),
    [state, ready, count, subtotal, add, setQuantity, remove, clear, pending, confirmReplace, cancelReplace]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
