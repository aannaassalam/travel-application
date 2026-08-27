import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type {
  Hotel,
  Listing,
  Order,
  Paged,
  Restaurant,
  SiteContact,
  Vertical
} from "@/types/domain";

/**
 * The one place the app talks to `/api/v1`.
 *
 * Mirrors the website's `lib/api.ts` deliberately — same endpoints, same
 * shapes, same idempotency rule — so the two clients cannot drift into
 * disagreeing about what the API returns.
 *
 * The one real difference is the session. The web holds an httpOnly cookie;
 * a native app has no cookie jar worth trusting, so the token is kept in the
 * device keychain and sent as a Bearer header. §7.3 forbids a session token in
 * web localStorage for the same reason SecureStore is right here: the store has
 * to be one a script on a page cannot reach.
 */

const API_BASE =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  "http://localhost:3001/api/v1";

const TOKEN_KEY = "flexi.session";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Cached in memory so the common path does not hit the keychain on every
// request; SecureStore is disk-backed and asking it per fetch is measurable.
let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A device with no secure enclave available still has to run.
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null) {
  cachedToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* an unwritable keychain means this session lasts until the app closes */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  /**
   * The server slides the session forward on any request more than a day into
   * it, and tells a non-cookie client through this header. Storing it here is
   * what stops the app asking for a new OTP every seven days — and what stops
   * us paying Twilio for it.
   */
  const renewed = res.headers.get("X-Session-Token");
  if (renewed && renewed !== token) void setToken(renewed);

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // The session is gone rather than merely refused: clear it so the UI can
    // ask for a sign-in instead of retrying with a token that will never work.
    if (res.status === 401 && body?.code === "SESSION_INVALID") void setToken(null);
    throw new ApiError(
      res.headers.get("X-Message") ?? body?.message ?? "Something went wrong",
      res.status
    );
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
};

// --- catalogue ---------------------------------------------------------------

export interface SearchQuery {
  vertical?: Vertical;
  destination?: string;
  origin?: string;
  from?: string;
  to?: string;
  adults?: number;
  sort?: string;
  limit?: number;
}

export const searchListings = (q: SearchQuery) =>
  request<Paged<Listing>>(`/listings${qs(q as never)}`);

export const getListing = (slug: string) =>
  request<{ listing: Listing; related: Listing[] }>(`/listings/${encodeURIComponent(slug)}`);

export const searchHotels = (q: SearchQuery) =>
  request<Paged<Hotel>>(`/hotels${qs(q as never)}`);

export const getHotel = (slug: string) =>
  request<{ hotel: Hotel; others: Hotel[] }>(`/hotels/${encodeURIComponent(slug)}`);

export const searchRestaurants = (q: { city?: string; cuisine?: string; limit?: number }) =>
  request<Paged<Restaurant>>(`/restaurants${qs(q as never)}`);

export const getRestaurant = (slug: string) =>
  request<{ restaurant: Restaurant }>(`/restaurants/${encodeURIComponent(slug)}`);

export const getSiteContact = () => request<{ contact: SiteContact }>("/site/contact");

// --- auth --------------------------------------------------------------------

export const requestOtp = (phone: string) =>
  request<{ sent: boolean }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone })
  });

export interface VerifyResult {
  token: string;
  customer: { firstName: string; lastName: string; phone: string; email?: string };
}

export const verifyOtp = (payload: {
  phone: string;
  code: string;
  firstName?: string;
  lastName?: string;
}) =>
  request<VerifyResult>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const me = () =>
  request<{ customer: { firstName: string; lastName: string; phone: string } }>("/auth/me");

// --- orders ------------------------------------------------------------------

export interface OrderDraft {
  items: { vertical: Vertical; listingId: string; roomTypeId?: string; quantity: number }[];
  delivery?: { address: string; zoneId: string; notes?: string };
  contact: { firstName: string; lastName: string; phone: string; email?: string };
  paymentMethod: "CASH" | "ONLINE";
  currency: string;
  locale: string;
}

export const createOrder = (draft: OrderDraft, idempotencyKey: string) =>
  request<{ order: Order }>("/orders", {
    method: "POST",
    // §4.6: the same key across every retry of one checkout, so a dropped
    // response replays the original order instead of booking twice.
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(draft)
  });

export const getOrder = (reference: string) =>
  request<{ order: Order }>(`/orders/${encodeURIComponent(reference)}`);

export const myOrders = () => request<{ items: Order[] }>("/me/orders");
