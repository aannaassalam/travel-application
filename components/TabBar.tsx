import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Compass, ShoppingBag, Ticket, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { useCart } from "@/lib/cart";
import { useSheetsOpen } from "@/lib/sheetCount";
import { color, font, space } from "@/theme/tokens";

/** How much scrollable content must clear at the bottom to stay readable
 *  above the floating bar (its height plus the gap beneath it). */
export const TAB_BAR_CLEARANCE = 76;

const ICONS: Record<string, typeof Compass> = {
  ExploreTab: Compass,
  RestaurantsTab: ShoppingBag,
  TripsTab: Ticket,
  AccountTab: User
};

/** One eased breath, shared by every moving part of a tab change so the pill,
 *  label and icons read as a single gesture. */
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const MS = 320;

const TAB_MIN = 48;

/**
 * The floating pill.
 *
 * A detached, shadowed bar floats over the content instead of fencing it: the
 * page scrolls away underneath, which reads as depth rather than chrome. The
 * active tab expands into a navy pill holding its label; the inactive ones sit
 * as quiet icons — the bar says where you are, not four labels at once.
 *
 * Every part of the hand-off is one shared value per tab, eased on the UI
 * thread: the pill's navy fades in as its width grows, the label slides in
 * under the icon's wing, and the icon itself crossfades between its two
 * tints. The previous version toggled styles and asked LayoutAnimation to
 * smooth over the jump — which Fabric on Android honours inconsistently, so
 * tab changes hitched exactly where they were supposed to glide.
 *
 * The label is always mounted (clipped, faded) rather than conditionally
 * rendered: mounting text mid-animation is a layout pop, and the measured
 * width is what the pill eases toward.
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
        {state.routes.map((route, index) => (
          <Tab
            key={route.key}
            focused={state.index === index}
            label={descriptors[route.key].options.title ?? route.name}
            Icon={ICONS[route.name] ?? Compass}
            badge={route.name === "RestaurantsTab" ? count : 0}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true
              });
              if (state.index !== index && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function Tab({
  focused,
  label,
  Icon,
  badge,
  onPress
}: {
  focused: boolean;
  label: string;
  Icon: typeof Compass;
  badge: number;
  onPress: () => void;
}) {
  const active = useSharedValue(focused ? 1 : 0);
  // The label's natural width, measured once from a hidden twin — the pill
  // eases toward it instead of guessing.
  const [labelW, setLabelW] = useState(0);
  const labelWidth = useSharedValue(0);

  useEffect(() => {
    active.value = withTiming(focused ? 1 : 0, { duration: MS, easing: EASE });
  }, [focused, active]);
  useEffect(() => {
    // Eased, not assigned. The measurement lands a few frames after first
    // paint (later on Android), and the initially-focused tab has already
    // drawn: a bare assignment snapped its pill open around a label that had
    // been sitting clipped inside the 48pt circle. Easing turns the late
    // measurement into the same glide a tab switch has.
    labelWidth.value = withTiming(labelW, { duration: 180, easing: EASE });
  }, [labelW, labelWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    width: TAB_MIN + active.value * (labelWidth.value ? labelWidth.value + space[2] + 6 : 0),
    backgroundColor: interpolateColor(active.value, [0, 1], ["#FFFFFF00", color.brand900])
  }));

  // The label rides in from under the icon: fade plus a short slide, fully
  // clipped by the pill while it travels. Until the twin has reported a width
  // the pill is still a circle, so the label stays invisible — text jammed
  // into a 48pt circle is the "half-clipped label" Android showed on launch.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelWidth.value > 1 ? active.value : 0,
    transform: [{ translateX: (1 - active.value) * -10 }]
  }));

  // Lucide colours are props, not styles — a worklet cannot reach them. Two
  // copies crossfade instead, which stays on the UI thread.
  const iconOffStyle = useAnimatedStyle(() => ({ opacity: 1 - active.value }));
  const iconOnStyle = useAnimatedStyle(() => ({ opacity: active.value }));

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tab, pillStyle]}>
        <View style={styles.iconStack}>
          <Animated.View style={iconOffStyle}>
            <Icon size={20} color={color.ink500} strokeWidth={2.2} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, iconOnStyle]}>
            <Icon size={20} color={color.white} strokeWidth={2.2} />
          </Animated.View>
          {badge > 0 ? (
            <View style={styles.badge}>
              <Text variant="2xs" weight="bold" style={styles.badgeText} allowFontScaling={false}>
                {badge > 9 ? "9+" : badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </Animated.View>
      {/* Invisible twin, out of the layout flow, purely to learn the width. */}
      <Text
        variant="sm"
        weight="bold"
        style={styles.measure}
        numberOfLines={1}
        onLayout={(e) => {
          const w = Math.ceil(e.nativeEvent.layout.width);
          if (w && w !== labelW) setLabelW(w);
        }}
      >
        {label}
      </Text>
    </Pressable>
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
    borderRadius: 999,
    paddingLeft: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    overflow: "hidden"
  },
  iconStack: { width: 20, height: 20 },
  iconCenter: { alignItems: "center", justifyContent: "center" },
  label: {
    color: color.white,
    fontFamily: font.bold,
    fontSize: 14,
    flexShrink: 0
  },
  measure: { position: "absolute", opacity: 0, left: -9999, top: 0 },
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
