import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { isReduceMotion } from "@/lib/reduceMotion";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * The pseudo shared element.
 *
 * True shared-element transitions are still experimental on this Reanimated
 * pairing, and this codebase has already met two worklets crashes — so the
 * feeling is built from the primitive that is known solid: the hero arrives
 * scaled up 8% and settles to rest as the screen slides in, which the eye
 * reads as the card's photograph expanding into place rather than a new
 * picture being dealt.
 *
 * Under Reduce Motion it renders at rest.
 */
export function HeroEntrance({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isReduceMotion()) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: 620, easing: EXPO_OUT });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0.55, 1, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1.08, 1]) }]
  }));

  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}
