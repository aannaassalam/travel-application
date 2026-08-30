import { haptic as fire } from "@/lib/haptics";
import { useCallback } from "react";
import { Pressable as RNPressable, StyleSheet, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing
} from "react-native-reanimated";
import { HIT_SLOP_MIN, motion } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);
const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * A press with weight.
 *
 * A touch screen gives no travel and no click, so the scale and the haptic ARE
 * the feedback — without them people tap twice and order twice. 120ms because a
 * press is immediate acknowledgement; anything slower reads as lag behind the
 * finger, which is the same reasoning the website's `.btn` uses.
 *
 * `hitSlop` guarantees the 44pt HIG target even where the visual control is
 * smaller, so a 32pt stepper button is still comfortably tappable.
 */
export function Pressable({
  children,
  style,
  scaleTo = 0.97,
  haptic = "light",
  disabled,
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  ...props
}: PressableProps & {
  style?: ViewStyle | ViewStyle[];
  scaleTo?: number;
  haptic?: "light" | "medium" | "selection" | "none";
}) {
  const pressed = useSharedValue(0);

  // Only the scale is animated; `disabled` is a static branch, and putting it
  // in the worklet forced a closure rebuild on the UI runtime for a value that
  // never changes mid-press. It rides the plain style array instead.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }]
  }));

  const onPressIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    (e) => {
      pressed.value = withTiming(1, { duration: motion.press, easing: EXPO_OUT });
      // The caller's handler runs too — prefetch-on-touch depends on it.
      onPressInProp?.(e);
      if (haptic === "none" || disabled) return;
      if (haptic === "selection") fire.selection();
      else if (haptic === "medium") fire.medium();
      else fire.light();
    },
    [pressed, haptic, disabled, onPressInProp]
  );

  const onPressOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    (e) => {
      pressed.value = withTiming(0, { duration: motion.press, easing: EXPO_OUT });
      onPressOutProp?.(e);
    },
    [pressed, onPressOutProp]
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={HIT_SLOP_MIN / 4}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[style, disabled && styles.disabled, animatedStyle]}
      {...props}
    >
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({ disabled: { opacity: 0.45 } });
