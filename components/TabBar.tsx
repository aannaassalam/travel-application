import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Compass, ShoppingBag, Ticket, User } from "lucide-react-native";
import { useEffect } from "react";
import { LayoutAnimation, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { useCart } from "@/lib/cart";
import { useSheetsOpen } from "@/lib/sheetCount";
import { color, space } from "@/theme/tokens";

/** How much scrollable content must clear at the bottom to stay readable
 *  above the floating bar (its height plus the gap beneath it). */
export const TAB_BAR_CLEARANCE = 76;

const ICONS: Record<string, typeof Compass> = {
  ExploreTab: Compass,
  RestaurantsTab: ShoppingBag,
  TripsTab: Ticket,
  AccountTab: User
};

/**
 * The floating pill.
 *
 * A detached, shadowed bar floats over the content instead of fencing it: the
 * page scrolls away underneath, which reads as depth rather than chrome. The
 * active tab expands into a navy pill holding its label; the inactive ones sit
 * as quiet icons — the bar says where you are, not four labels at once.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const sheetsOpen = useSheetsOpen();

  // While a sheet is up the bar steps out of the way — the sheet owns the
  // bottom of the screen, and its buttons must never share it with chrome.
  const hidden = useSharedValue(0);
  useEffect(() => {
    hidden.value = withTiming(sheetsOpen ? 1 : 0, {
      // Matched to the sheet's own ~300ms spring so the two read as one
      // choreography rather than a bar chasing a sheet.
      duration: 300,
      easing: Easing.bezier(0.16, 1, 0.3, 1)
    });
  }, [sheetsOpen, hidden]);
  const hideStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * 120 }]
  }));

  return (
    <Animated.View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - 6, space[3]) }, hideStyle]}
      pointerEvents={sheetsOpen ? "none" : "box-none"}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name] ?? Compass;
          const label = descriptors[route.key].options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });
            if (!focused && !event.defaultPrevented) {
              // The pill hands its width to the next tab in one eased motion
              // instead of teleporting — the label mount/unmount rides this.
              LayoutAnimation.configureNext({
                duration: 260,
                create: { type: "easeInEaseOut", property: "opacity" },
                update: { type: "easeInEaseOut" },
                delete: { type: "easeInEaseOut", property: "opacity" }
              });
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabOn]}
              haptic="selection"
              scaleTo={0.94}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View>
                <Icon
                  size={20}
                  color={focused ? color.white : color.ink500}
                  strokeWidth={2.2}
                />
                {route.name === "RestaurantsTab" && count > 0 ? (
                  <View style={styles.badge}>
                    <Text variant="2xs" weight="bold" style={styles.badgeText} allowFontScaling={false}>
                      {count > 9 ? "9+" : count}
                    </Text>
                  </View>
                ) : null}
              </View>
              {focused ? (
                <Text variant="sm" weight="bold" style={styles.labelOn} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center"
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    backgroundColor: color.white,
    borderRadius: 999,
    padding: space[1.5],
    // Elevation is the whole trick: the bar has to sit visibly ABOVE the
    // page, or a floating pill just looks like a lost segment control.
    shadowColor: color.brand900,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12
  },
  tab: {
    height: 48,
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2]
  },
  tabOn: { backgroundColor: color.brand900, paddingHorizontal: space[4] },
  labelOn: { color: color.white },
  badge: {
    position: "absolute",
    top: -6,
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
