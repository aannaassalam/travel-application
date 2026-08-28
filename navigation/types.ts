import { useNavigation, type NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Money, Vertical } from "@/types/domain";

/**
 * What the customer chose, carried into the booking modal. Everything is
 * serialisable — it rides as a route param. Prices are indicative: the server
 * re-prices every line at order time, and its number is the one charged.
 */
export interface BookingSelection {
  vertical: Vertical;
  /** The listing for everything except hotel stays… */
  listingId?: string;
  /** …which book by room, and the server finds the hotel from it. */
  roomTypeId?: string;
  title: string;
  sub?: string;
  image?: string;
  unitPrice: Money;
  quantity: number;
  /** Nights for a stay, days for a car hire, 1 otherwise. */
  units: number;
  unitNoun: "night" | "day" | "person";
  startDate?: string;
  endDate?: string;
}

export type TabParamList = {
  ExploreTab: undefined;
  RestaurantsTab: { city?: string } | undefined;
  TripsTab: undefined;
  AccountTab: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Restaurant: { slug: string };
  Hotel: { slug: string };
  Results: { vertical: Vertical; destination?: string };
  Checkout: undefined;
  Booking: { selection: BookingSelection };
  Login: undefined;
  Saved: undefined;
  Order: { reference: string };
};

/** Typed navigation without every screen re-declaring the same generic. */
export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
