/**
 * Domain vocabulary, mirrored from the API's public DTOs and the website's
 * `typescript/interface/domain.interface.ts`. Nothing here is invented for the
 * app: if a field is not on the wire, it is not in this file.
 */

export const VERTICALS = {
  HOTEL: "HOTEL",
  RESTAURANT: "RESTAURANT",
  FLIGHT: "FLIGHT",
  BUS: "BUS",
  CAR: "CAR",
  PROPERTY: "PROPERTY",
  ACTIVITY: "ACTIVITY"
} as const;
export type Vertical = (typeof VERTICALS)[keyof typeof VERTICALS];

export type Locale = "fr" | "en";
export type Currency = "USD" | "CDF" | "EUR";
export type Localized = Partial<Record<Locale, string>>;

/**
 * Per-currency integer minor units. Each is an explicit price an administrator
 * typed, never a conversion — a converted price drifts with the rate between
 * the moment a customer sees it and the moment they pay, and under a no-refund
 * policy that difference is not something anyone wants to argue about.
 */
export type Money = Partial<Record<Currency, number>>;

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface FlightSegment {
  origin: string;
  destination: string;
  departsAt: string;
  arrivesAt: string;
  carrier?: string;
  flightNumber?: string;
}

/** The per-vertical facts the admin typed; only what the wire carries. */
export interface ListingAttributes {
  segments?: FlightSegment[];
  cabin?: string;
  tripType?: string;
  baggage?: string;
  operator?: string;
  vehicleClass?: string;
  departsAt?: string;
  arrivesAt?: string;
  routeStops?: string[];
  category?: string;
  transmission?: string;
  mileageLimit?: string;
  pickupLocations?: string[];
  withDriver?: boolean;
  durationMinutes?: number;
  maxParticipants?: number;
  propertyType?: string;
  bedrooms?: number;
  areaSqm?: number;
  plotSizeSqm?: number;
  priceBasis?: string;
  availabilityStatus?: string;
  [key: string]: unknown;
}

export interface Listing {
  id: string;
  vertical: Vertical;
  title: Localized;
  slug: string;
  description: Localized;
  city: string;
  images: string[];
  sellPrice: Money;
  available?: number;
  rating?: number;
  reviewCount?: number;
  attributes?: ListingAttributes;
}

export interface RoomType {
  id: string;
  name: Localized;
  description: Localized;
  maxAdults: number;
  beds: string;
  images: string[];
  sellPrice?: Money;
  available?: number;
}

export interface Hotel {
  id: string;
  name: Localized;
  slug: string;
  description: Localized;
  stars: number;
  address: string;
  city: string;
  amenities: string[];
  images: string[];
  rating?: number;
  reviewCount?: number;
  fromPrice: Money;
  roomTypes?: RoomType[];
}

export const MENU_SECTIONS = ["STARTER", "MAIN", "SIDE", "DESSERT", "DRINK"] as const;
export type MenuSection = (typeof MENU_SECTIONS)[number];

export interface MenuItem {
  id: string;
  restaurantId: string;
  section: MenuSection;
  name: Localized;
  description: Localized;
  sellPrice: Money;
  images: string[];
  /** False means 86'd today: shown, greyed, not orderable. */
  isAvailable: boolean;
  sortOrder: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: Money;
  minOrder?: Money;
  etaMinutes: number;
}

export interface Restaurant {
  id: string;
  name: Localized;
  slug: string;
  description: Localized;
  cuisines: string[];
  address: string;
  city: string;
  images: string[];
  openingHours: string;
  prepTimeMinutes: number;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  deliveryZones: DeliveryZone[];
  fromPrice: Money;
  menu?: MenuItem[];
}

export interface OrderItem {
  vertical: Vertical;
  listingLabel: string;
  quantity: number;
  lineTotal: Money;
  startDate?: string;
  endDate?: string;
}

export interface Traveller {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  documentType?: "PASSPORT" | "ID" | "OTHER";
  documentNumber?: string;
  documentNumberMasked?: string;
  nationality?: string;
}

export interface TimelineEntry {
  event: string;
  at: string;
  detail?: string;
}

export interface Order {
  reference: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  items: OrderItem[];
  total: Money;
  chargedCurrency: Currency;
  chargedTotal: number;
  paymentMethod: "CASH" | "ONLINE";
  cashDeadline?: string;
  travellers?: Traveller[];
  timeline?: TimelineEntry[];
  createdAt?: string;
  delivery?: {
    address: string;
    zoneName?: string;
    fee: number;
    feeCharged: number;
    etaMinutes?: number;
    notes?: string;
  };
}

export interface SiteContact {
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  streetAddress: string;
  city: string;
  country: string;
  officeHours: string;
}
