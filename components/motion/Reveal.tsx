import { useEffect } from "react";
import { AccessibilityInfo, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * A staggered entrance, from an already-visible default.
 *
 * The rise is small — 14pt — because a list of ten cards each travelling 40pt
 * reads as a slot machine, not an arrival. `index` staggers by 55ms, which is
 * enough to feel sequenced and short enough that the tenth card is not still
 * animating when a thumb reaches it.
 *
 * Under Reduce Motion it renders plainly: no fade, no travel, no delay. A
 * crossfade would still be motion, and the setting asks for none.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  style
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: ViewStyle;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        progress.value = 1;
        return;
      }
      progress.value = withDelay(
        delay + index * 55,
        withTiming(1, { duration: 420, easing: EXPO_OUT })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [progress, index, delay]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }]
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
