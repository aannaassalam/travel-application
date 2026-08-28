import { useIsFocused } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { useCallback } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { useAppNavigation } from "@/navigation/types";
import { color, space } from "@/theme/tokens";

/**
 * A detail-screen header that arrives as you scroll past the hero.
 *
 * The bar is invisible while the photograph is doing the work, and fades in on
 * a near-opaque paper plate once the title would otherwise scroll into the
 * notch. The back control sits OUTSIDE the fade so it is always hit-able — a
 * back button that is invisible at the top of a screen traps anyone who does
 * not know the edge-swipe.
 */
export function ScreenHeader({
  title,
  scrollY,
  threshold = 180,
  hero = true
}: {
  title: string;
  scrollY: SharedValue<number>;
  threshold?: number;
  /** False when the screen starts on paper rather than a photograph — the
   *  clock then stays dark throughout instead of arriving invisible. */
  hero?: boolean;
}) {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();

  /**
   * The clock flips with the plate: light text over the hero photograph, dark
   * the moment the near-white bar fades in under it. One boolean, driven from
   * the same scroll value, so the two can never disagree.
   *
   * The flip goes through a component-scope callback, NOT the native-module
   * static directly — handing `StatusBar.setBarStyle` itself to runOnJS made
   * the worklets runtime abort in `toOptimizedObject` the moment this header
   * mounted, which read as "the app crashes opening any detail screen".
   */
  const setBar = useCallback(
    (past: boolean) => {
      if (!hero) return;
      StatusBar.setBarStyle(past ? "dark-content" : "light-content", true);
    },
    [hero]
  );

  useAnimatedReaction(
    () => scrollY.value > threshold - 30,
    (past, was) => {
      if (past !== was) runOnJS(setBar)(past);
    },
    [setBar, threshold]
  );

  const plate = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [threshold - 60, threshold], [0, 1], Extrapolation.CLAMP)
  }));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]} pointerEvents="box-none">
      {focused && hero && <StatusBar barStyle="light-content" animated />}
      <Animated.View style={[StyleSheet.absoluteFill, styles.plate, plate]} />
      <View style={styles.row}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <ChevronLeft size={22} color={color.brand900} strokeWidth={2.4} />
        </Pressable>
        <Animated.View style={[styles.titleWrap, plate]} pointerEvents="none">
          <Text variant="base" weight="bold" tone="brand900" numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
        {/* Balance spacer: same width as the back control, no plate — an
            empty white circle floating in the corner is not a control. */}
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  plate: {
    // Solid, not 0.96: at 4% translucency bold navy menu copy stayed legible
    // through the bar and collided with the centred title.
    backgroundColor: color.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.ink100
  },
  row: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[3],
    gap: space[2]
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  titleWrap: { flex: 1, alignItems: "center", backgroundColor: "transparent", borderBottomWidth: 0 },
  spacer: { width: 40, height: 40 }
});
