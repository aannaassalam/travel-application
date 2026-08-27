import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { AccessibilityInfo, Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { color } from "@/theme/tokens";

const { width: W, height: H } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The splash — the one authored moment in the app.
 *
 * The mark is a road curving away past a skyline with an aircraft leaving it,
 * so the sequence animates the journey the logo already draws rather than
 * inventing a generic fade-and-rise:
 *
 *   1. The ground blooms from near-black to navy, so the screen arrives lit
 *      rather than switched on.
 *   2. A road draws across the horizon, left to right, in amber.
 *   3. The mark lands on it — overshooting slightly and settling, the way a
 *      thing with weight does.
 *   4. The wordmark rises out from under the mark.
 *   5. Everything lifts away and the app is already behind it.
 *
 * Every stage is an exponential ease-out from an already-visible default, and
 * the whole thing is under 2 seconds — a splash that outstays that is a tax on
 * every launch, not a welcome.
 *
 * Reduce Motion collapses the choreography to a single crossfade. The brand
 * still arrives; it just does not travel to get there.
 */

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** The horizon the road is drawn along, as a share of the viewport. */
const ROAD_Y = H * 0.5;
const ROAD_PATH = `M ${-W * 0.1} ${ROAD_Y} Q ${W * 0.5} ${ROAD_Y - 46} ${W * 1.1} ${ROAD_Y}`;
// Generous over-estimate of the arc length; the dash only needs to exceed it.
const ROAD_LEN = W * 1.4;

export default function Splash({ onDone }: { onDone: () => void }) {
  const ground = useSharedValue(0);
  const road = useSharedValue(0);
  const mark = useSharedValue(0);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;

      if (reduced) {
        // One crossfade, one hold, then out. No travel, no stagger.
        ground.value = withTiming(1, { duration: 200 });
        mark.value = withTiming(1, { duration: 260 });
        word.value = withTiming(1, { duration: 260 });
        exit.value = withDelay(
          760,
          withTiming(1, { duration: 260 }, (finished) => {
            if (finished) runOnJS(onDone)();
          })
        );
        return;
      }

      ground.value = withTiming(1, { duration: 520, easing: EXPO_OUT });
      road.value = withDelay(120, withTiming(1, { duration: 700, easing: EXPO_OUT }));
      // Overshoot then settle: the second leg is shorter, so it reads as weight
      // coming to rest rather than as a bounce.
      mark.value = withDelay(
        360,
        withSequence(
          withTiming(1.06, { duration: 460, easing: EXPO_OUT }),
          withTiming(1, { duration: 220, easing: EXPO_OUT })
        )
      );
      word.value = withDelay(640, withTiming(1, { duration: 520, easing: EXPO_OUT }));
      exit.value = withDelay(
        1450,
        withTiming(1, { duration: 460, easing: EXPO_OUT }, (finished) => {
          if (finished) runOnJS(onDone)();
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, [ground, road, mark, word, exit, onDone]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    // The whole plate lifts on the way out, so the app appears to be underneath
    // it rather than replacing it.
    transform: [{ translateY: -exit.value * H * 0.06 }, { scale: 1 + exit.value * 0.04 }]
  }));

  const groundStyle = useAnimatedStyle(() => ({ opacity: ground.value }));

  // SVG geometry is not a style: `strokeDashoffset` has to travel as an
  // animated prop, or Reanimated writes it into a style object react-native-svg
  // never reads and the line simply appears all at once.
  const roadProps = useAnimatedProps(() => ({
    strokeDashoffset: ROAD_LEN * (1 - road.value),
    opacity: interpolate(road.value, [0, 0.15, 1], [0, 1, 0.55])
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mark.value, [0, 1], [0, 0.85]),
    transform: [{ scale: interpolate(mark.value, [0, 1], [0.4, 1]) }]
  }));

  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mark.value, [0, 0.35, 1], [0, 1, 1]),
    transform: [
      { scale: interpolate(mark.value, [0, 1.06], [0.72, 1.06]) },
      { translateY: interpolate(mark.value, [0, 1], [26, 0]) }
    ]
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [18, 0]) }]
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.shell, shellStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, groundStyle]}>
        <LinearGradient
          colors={[color.brand800, color.brand900, "#061726"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* The road, drawn rather than faded — a stroke-dash reveal is the one
          way to make a line look travelled instead of switched on. */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="road" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color.accent500} stopOpacity="0" />
            <Stop offset="0.5" stopColor={color.accent500} stopOpacity="1" />
            <Stop offset="1" stopColor={color.accent500} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <AnimatedPath
          d={ROAD_PATH}
          stroke="url(#road)"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ROAD_LEN}
          animatedProps={roadProps}
        />
      </Svg>

      <View style={styles.centre}>
        {/* A warm bloom behind the mark, so it sits in light rather than on a
            flat field. Blur is unavailable to a native shadow at this size, so
            the softness comes from a radial-ish stack of gradients. */}
        <Animated.View style={[styles.glow, glowStyle]}>
          <LinearGradient
            colors={["rgba(245,166,35,0.32)", "rgba(245,166,35,0.06)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={markStyle}>
          <Image
            source={require("@/assets/images/mark.webp")}
            style={styles.mark}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>

        <Animated.View style={[styles.wordWrap, wordStyle]}>
          <Image
            source={require("@/assets/images/wordmark.webp")}
            style={styles.word}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: color.brand900, zIndex: 100 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    overflow: "hidden"
  },
  mark: { width: 108, height: 120 },
  wordWrap: { marginTop: 28 },
  word: { width: 208, height: 44 }
});
