import { Tabs } from "expo-router";
import { Compass, ShoppingBag, Ticket, User } from "lucide-react-native";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useCart } from "@/lib/cart";
import { usePrefs } from "@/lib/prefs";
import { Text } from "@/components/ui/Text";
import { color, font, space } from "@/theme/tokens";

/**
 * Four top-level sections, which is inside the HIG's 2–5.
 *
 * They are sections, never actions: there is no "Book" tab, because booking is
 * something you do inside a section rather than a place you go. The basket
 * count rides on Restaurants instead of claiming a fifth tab of its own.
 *
 * The bar is a system material on iOS so content dims through it rather than
 * hiding behind an opaque slab; Android gets a solid surface, which is what its
 * own navigation does.
 */
export default function TabLayout() {
  const { t } = usePrefs();
  const { count } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand900,
        tabBarInactiveTintColor: color.ink500,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        tabBarStyle: Platform.select({
          ios: { position: "absolute", borderTopColor: color.ink100, backgroundColor: "transparent" },
          default: { backgroundColor: color.white, borderTopColor: color.ink100 }
        }),
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : null
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab.explore"),
          tabBarIcon: ({ color: c, size }) => <Compass color={c} size={size} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="restaurants"
        options={{
          title: t("tab.eat"),
          tabBarIcon: ({ color: c, size }) => (
            <View>
              <ShoppingBag color={c} size={size} strokeWidth={2} />
              {count > 0 && (
                <View style={styles.badge}>
                  <Text variant="2xs" weight="bold" style={styles.badgeText} allowFontScaling={false}>
                    {count > 9 ? "9+" : count}
                  </Text>
                </View>
              )}
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t("tab.trips"),
          tabBarIcon: ({ color: c, size }) => <Ticket color={c} size={size} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tab.account"),
          tabBarIcon: ({ color: c, size }) => <User color={c} size={size} strokeWidth={2} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: space[1],
    backgroundColor: color.accent500,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: { color: color.brand900, lineHeight: 17 }
});
