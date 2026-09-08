import { DefaultTheme, NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Splash from "@/components/Splash";
import { markSplashComplete } from "@/lib/splashState";
import { TabBar } from "@/components/TabBar";
import { getHomeFeed, getSiteContact, searchListings, searchRestaurants } from "@/lib/api";
import { CartProvider } from "@/lib/cart";
import { PrefsProvider, usePrefs } from "@/lib/prefs";
import { SessionProvider } from "@/lib/session";
import type { RootStackParamList, TabParamList } from "@/navigation/types";
import AccountScreen from "@/screens/AccountScreen";
import BookingScreen from "@/screens/BookingScreen";
import CheckoutScreen from "@/screens/CheckoutScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import HotelScreen from "@/screens/HotelScreen";
import LoginScreen from "@/screens/LoginScreen";
import OrderScreen from "@/screens/OrderScreen";
import RestaurantScreen from "@/screens/RestaurantScreen";
import RestaurantsScreen from "@/screens/RestaurantsScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import SavedScreen from "@/screens/SavedScreen";
import TripsScreen from "@/screens/TripsScreen";
import { color } from "@/theme/tokens";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A catalogue moves slowly; refetching on every focus would spend a
      // metered connection on data that has not changed.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

// Warm the caches the home screen will ask for, before React even mounts —
// the first paint then renders from cache instead of a spinner.
void queryClient.prefetchQuery({ queryKey: ["home-feed"], queryFn: getHomeFeed });
void queryClient.prefetchQuery({
  queryKey: ["restaurants", "rail"],
  queryFn: () => searchRestaurants({ limit: 6 })
});
void queryClient.prefetchQuery({ queryKey: ["site-contact"], queryFn: getSiteContact });
for (const vertical of ["FLIGHT", "BUS", "CAR", "ACTIVITY"] as const) {
  void queryClient.prefetchQuery({
    queryKey: ["listings", vertical, "rail"],
    queryFn: () => searchListings({ vertical, limit: 6 })
  });
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Four top-level sections, inside the HIG's 2–5, and they are sections rather
 * than actions — there is no "Book" tab because booking is something you do
 * inside a section, not a place you go. The basket count rides on Restaurants
 * instead of claiming a fifth tab.
 */
function Tabs() {
  const { t } = usePrefs();

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Tabs cross-fade with a slight lateral shift instead of hard-cutting
        // — enough motion to carry you across, not enough to feel like travel.
        animation: "shift"
      }}
    >
      <Tab.Screen name="ExploreTab" component={ExploreScreen} options={{ title: t("tab.explore") }} />
      <Tab.Screen
        name="RestaurantsTab"
        component={RestaurantsScreen}
        options={{ title: t("tab.eat") }}
      />
      <Tab.Screen name="TripsTab" component={TripsScreen} options={{ title: t("tab.trips") }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ title: t("tab.account") }} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.paper, card: color.white }
};

/**
 * Deep links: the custom scheme plus the website's own URLs, mapped onto the
 * same paths the site uses — a hotel link shared from the website opens the
 * hotel in the app. Order links use the reference, which is the only public
 * handle an order has.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["flexiagency://", "https://flexiairbnb.com", "https://www.flexiairbnb.com"],
  config: {
    screens: {
      Tabs: {
        screens: {
          ExploreTab: "",
          RestaurantsTab: "restaurants",
          TripsTab: "account/orders",
          AccountTab: "account"
        }
      },
      Hotel: "hotels/:slug",
      Saved: "account/saved",
      Restaurant: "restaurants/:slug",
      Order: "orders/:reference",
      Login: "login"
    }
  }
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => {
    setSplashDone(true);
    markSplashComplete();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PrefsProvider>
            <SessionProvider>
              <CartProvider>
                <StatusBar
                  barStyle={splashDone ? "dark-content" : "light-content"}
                  backgroundColor={splashDone ? color.paper : color.brand900}
                />
                <NavigationContainer theme={navTheme} linking={linking}>
                  <Stack.Navigator
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: color.paper },
                      // Push slides, sheets rise. Custom transitions that fight
                      // the navigation model disorient more than they delight.
                      animation: "slide_from_right"
                    }}
                  >
                    <Stack.Screen name="Tabs" component={Tabs} />
                    <Stack.Screen name="Restaurant" component={RestaurantScreen} />
                    <Stack.Screen name="Hotel" component={HotelScreen} />
                    <Stack.Screen name="Results" component={ResultsScreen} />
                    <Stack.Screen
                      name="Checkout"
                      component={CheckoutScreen}
                      options={{
                        // A route, not a sheet: a half-finished checkout is
                        // data worth protecting from an accidental swipe down.
                        presentation: "modal",
                        animation: "slide_from_bottom"
                      }}
                    />
                    <Stack.Screen
                      name="Booking"
                      component={BookingScreen}
                      options={{
                        // Same contract as Checkout: a form in flight is data.
                        presentation: "modal",
                        animation: "slide_from_bottom"
                      }}
                    />
                    <Stack.Screen name="Order" component={OrderScreen} />
                    <Stack.Screen name="Saved" component={SavedScreen} />
                    <Stack.Screen
                      name="Login"
                      component={LoginScreen}
                      options={{
                        // A gate you step into and dismiss, not a place you
                        // navigate through — it rises like a sheet but owns
                        // the whole screen and the keyboard.
                        presentation: "fullScreenModal",
                        animation: "slide_from_bottom"
                      }}
                    />
                  </Stack.Navigator>
                </NavigationContainer>
                {!splashDone && <Splash onDone={onSplashDone} />}
              </CartProvider>
            </SessionProvider>
          </PrefsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.brand900 }
});
