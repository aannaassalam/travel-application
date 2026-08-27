import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { color, radius } from "@/theme/tokens";

/**
 * A loading placeholder shaped like the thing it stands in for, so the layout
 * does not jump when data lands.
 *
 * It breathes rather than sweeps: a travelling highlight needs a gradient and a
 * mask per placeholder, and on a list of ten cards that is ten more layers for
 * an effect nobody consciously sees.
 */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[styles.base, style, animated]} />;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.ink100, borderRadius: radius.sm },
  row: { flexDirection: "row", alignItems: "center" }
});
