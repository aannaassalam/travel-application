import { useIsFocused } from "@react-navigation/native";
import { useEffect } from "react";
import { type ViewStyle } from "react-native";
import { isReduceMotion } from "@/lib/reduceMotion";
import { useSplashRevealed } from "@/lib/splashState";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Rows past this stop queueing behind the ones before them. Inside a
 *  virtualised list `index` is the absolute data index, so row 30 mounting
 *  mid-scroll would otherwise sit invisible for a second and a half first. */
const MAX_STAGGER = 6;

/**
 * A staggered entrance, from an already-visible default.
 *
 * The rise is small — 14pt — because a list of ten cards each travelling 40pt
 * reads as a slot machine, not an arrival. `index` staggers by 55ms, capped at
 * MAX_STAGGER steps so lazily-mounted list rows appear promptly.
 *
 * It plays once and stays played. Re-arming to the hidden pose on blur assumed
 * a blurred screen is an unseen one, and it is not: native-stack keeps the
 * screen beneath a push mounted, so a back-swipe drags a blank page into view
 * for the whole gesture and only fills it in once focus lands.
 *
 * Under Reduce Motion it renders plainly: no fade, no travel, no delay. A
 * crossfade would still be motion, and the setting asks for none. The flag
 * comes from the cached store — sixty of these mount on Explore at once, and
 * each asking the native side itself was a burst of async traffic timed
 * exactly against the first frame.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  duration = 420,
  style
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  /** Longer on pages that should arrive unhurried; default fits lists. */
  duration?: number;
  style?: ViewStyle;
}) {
  const progress = useSharedValue(0);
  const focused = useIsFocused();
  const revealed = useSplashRevealed();

  useEffect(() => {
    if (!focused || !revealed) return;
    if (isReduceMotion()) {
      progress.value = 1;
      return;
    }
    const stagger = delay + Math.min(index, MAX_STAGGER) * 55;
    progress.value = withDelay(stagger, withTiming(1, { duration, easing: EXPO_OUT }));
    // Deadman's switch. On some devices an entrance can be lost — seen in the
    // wild as a section flashing in and then sitting invisible, likely a
    // remount or animation-attach race under startup load. The cause is timing
    // we cannot reproduce at will, so the guarantee lives here instead: past
    // the moment the entrance MUST have finished, drive the value to 1 again.
    // Re-animating an already-settled value is an invisible no-op; rescuing a
    // lost one is a quick late fade rather than permanently hidden content.
    const deadman = setTimeout(() => {
      progress.value = withTiming(1, { duration: 150 });
    }, stagger + duration + 350);
    return () => clearTimeout(deadman);
  }, [progress, index, delay, duration, focused, revealed]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }]
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
