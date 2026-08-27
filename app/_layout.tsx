import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFraunces
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter
} from "@expo-google-fonts/inter";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Splash from "@/components/Splash";
import { CartProvider } from "@/lib/cart";
import { PrefsProvider } from "@/lib/prefs";
import { SessionProvider } from "@/lib/session";
import { color } from "@/theme/tokens";

/**
 * The native splash stays up until the fonts are in.
 *
 * Without this the first frame renders in the system face and reflows the
 * instant Inter arrives — the flash of unstyled text that makes an app feel
 * assembled rather than built. The animated splash then takes over from the
 * static one, so the hand-off is invisible: both are the same mark on the same
 * navy.
 */
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A catalogue moves slowly; refetching on every screen focus would spend
      // a metered connection on data that has not changed.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export default function RootLayout() {
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
  });
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold, Fraunces_700Bold });
  const [splashDone, setSplashDone] = useState(false);

  const ready = interLoaded && frauncesLoaded;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const onSplashDone = useCallback(() => setSplashDone(true), []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.paper }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PrefsProvider>
            <SessionProvider>
              <CartProvider>
                <BottomSheetModalProvider>
                  <StatusBar style={splashDone ? "dark" : "light"} />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: color.paper },
                      // Push slides, sheets rise. Custom transitions that fight
                      // the navigation model disorient more than they delight.
                      animation: "slide_from_right"
                    }}
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="restaurant/[slug]" />
                    <Stack.Screen name="hotel/[slug]" />
                    <Stack.Screen name="results/[vertical]" />
                    <Stack.Screen
                      name="checkout"
                      options={{
                        // A route, not a sheet: a half-finished checkout is
                        // data worth protecting from an accidental swipe down.
                        presentation: "modal",
                        animation: "slide_from_bottom"
                      }}
                    />
                    <Stack.Screen name="order/[reference]" />
                  </Stack>
                  {!splashDone && <Splash onDone={onSplashDone} />}
                </BottomSheetModalProvider>
              </CartProvider>
            </SessionProvider>
          </PrefsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
