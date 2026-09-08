import * as Keychain from "react-native-keychain";
import { API_BASE } from "@/lib/config";
import type {
  Hotel,
  Listing,
  Order,
  Paged,
  Restaurant,
  SiteContact,
  Traveller,
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
 * a native app has no cookie jar worth trusting, so the token lives in the
 * device keychain and travels as a Bearer header. §7.3 forbids a session token
 * in web localStorage for the same reason the keychain is right here: the
 * store has to be one no script or backup dump can casually read.
 */

const KEYCHAIN_SERVICE = "com.flexiagency.app.session";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /**
     * The server's machine-readable reason. Screens switch on this, never on
     * the message: the message is English prose from the API, and matching it
     * with a regex — which is what sign-in used to do — silently stops working
     * the moment the copy is edited or the customer is reading in French.
     */
    public code?: string
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
    const stored = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    cachedToken = stored ? stored.password : null;
  } catch {
    // A device with no keychain access still has to run.
    cachedToken = null;
  }
  return cachedToken;
}

export async function setToken(token: string | null) {
  cachedToken = token;
  try {
    if (token) {
      await Keychain.setGenericPassword("session", token, { service: KEYCHAIN_SERVICE });
    } else {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    }
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
      res.status,
      body?.code
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

export const getHotel = (slug: string, from?: string, to?: string) =>
  // With dates, price and availability come back scoped to that stay;
  // without, availability is the tightest night ever loaded — pessimistic.
  request<{ hotel: Hotel; others: Hotel[] }>(
    `/hotels/${encodeURIComponent(slug)}${qs({ from, to })}`
  );

export const searchRestaurants = (q: { city?: string; cuisine?: string; limit?: number }) =>
  request<Paged<Restaurant>>(`/restaurants${qs(q as never)}`);

export const getRestaurant = (slug: string) =>
  request<{ restaurant: Restaurant }>(`/restaurants/${encodeURIComponent(slug)}`);

export const getSiteContact = () => request<{ contact: SiteContact }>("/site/contact");

/** The homepage feed: two of every sellable vertical, interleaved, plus the
 *  newest properties and the top hotels — the same rail the website leads with. */
export const getHomeFeed = () =>
  request<{ deals: Listing[]; properties: Listing[]; hotels: Hotel[] }>("/catalogue/home");

export const createEnquiry = (payload: {
  customerName: string;
  phone: string;
  message: string;
  vertical?: Vertical;
}, idempotencyKey: string) =>
  request<{ reference: string }>("/enquiries", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload)
  });

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

/**
 * Sign-up. The ONLY flow that spends an SMS to get in: it proves the number,
 * creates the account with the password the customer chose, and returns a
 * session. Every later sign-in goes through `login`.
 */
export const verifyOtp = (payload: {
  phone: string;
  code: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) =>
  request<VerifyResult>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });

/** The everyday way in: number + password, no SMS and no waiting for one. */
export const login = (payload: { phone: string; password: string }) =>
  request<VerifyResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

/**
 * Spends a code from `requestOtp` and sets the new password in the same call.
 * The server signs them in on success — bouncing someone back to a login form
 * to retype a password chosen ten seconds ago is a hurdle for nothing.
 */
export const resetPassword = (payload: {
  phone: string;
  code: string;
  password: string;
}) =>
  request<VerifyResult>("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const me = () =>
  request<{ customer: { firstName: string; lastName: string; phone: string; email?: string } }>(
    "/auth/me"
  );

export const updateMe = (patch: { firstName?: string; lastName?: string; email?: string }) =>
  request<{ customer: { firstName: string; lastName: string; phone: string; email?: string } }>(
    "/auth/me",
    { method: "PATCH", body: JSON.stringify(patch) }
  );

// --- orders ------------------------------------------------------------------

export interface OrderDraft {
  items: {
    vertical: Vertical;
    listingId?: string;
    roomTypeId?: string;
    /** ISO dates; a stay needs both, a car hire prices per day between them. */
    startDate?: string;
    endDate?: string;
    quantity: number;
  }[];
  delivery?: { address: string; zoneId: string; notes?: string };
  travellers?: Traveller[];
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
