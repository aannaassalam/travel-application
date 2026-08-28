import { useEffect } from "react";
import { AccessibilityInfo, Dimensions, Image, StyleSheet } from "react-native";
import BootSplash from "react-native-bootsplash";
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
import { GradientFill, RadialGlow } from "@/components/ui/Gradient";
import { markSplashRevealed } from "@/lib/splashState";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { color } from "@/theme/tokens";

const { width: W, height: H } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The splash — the one authored moment in the app.
 *
 * It begins exactly where the native launch screen ends: the same flat navy,
 * the same mark at the same size in the same place. `BootSplash.hide` runs
 * with no fade on this component's first frame, so the hand-off is a cut
 * between two identical pictures — invisible. The last version faded a
 * *different* navy in over the launch screen's, which is where the mismatched
 * edges came from; this one has a single ground colour and a mark whose alpha
 * was recovered from the artwork rather than flood-filled out of the app icon.
 *
 * Then the picture starts moving — the journey the logo already draws:
 *
 *   1. An amber road draws itself across the horizon, behind the mark.
 *   2. The mark wakes: a small lift with a settle, making room.
 *   3. The wordmark rises out from under it.
 *   4. A vignette deepens the ground while a warm glow blooms behind the mark.
 *   5. The whole plate lifts away; the app is already underneath.
 *
 * Every stage is an exponential ease-out from an already-visible state, and
 * the whole run is under two seconds — a splash that outstays that is a tax on
 * every launch, not a welcome.
 *
 * Reduce Motion holds the still lockup briefly and dissolves. The brand still
 * arrives; it just does not travel to get there.
 */

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** Must match the bootsplash generate flags: logo-width 120, ratio 400:446. */
const MARK_W = 120;
const MARK_H = Math.round((MARK_W * 446) / 400);
/** How far the mark lifts to make room for the wordmark. */
const LIFT = 34;

// Type only — the full lockup contains its own small copy of the mark, and
// the splash already has the mark, large, directly above. One brand, once.
const WORD_W = 168;
// Ratio of the re-cropped type (675×142) — the old fixed-ratio crop started
// inside the F and clipped it.
const WORD_H = Math.round((WORD_W * 142) / 675);

const ROAD_Y = H * 0.5 + MARK_H / 2 - 14;
const ROAD_PATH = `M ${-W * 0.1} ${ROAD_Y} Q ${W * 0.5} ${ROAD_Y - 42} ${W * 1.1} ${ROAD_Y}`;
const ROAD_LEN = W * 1.4;

export default function Splash({ onDone }: { onDone: () => void }) {
  const road = useSharedValue(0);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);
  const glow = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // First frame is committed by the time this effect runs; hiding the native
    // splash now swaps between two identical pictures.
    void BootSplash.hide({ fade: false });

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;

      if (reduced) {
        lift.value = 1;
        word.value = 1;
        // The reveal signal rides the same clock as the exit's start.
        timer = setTimeout(markSplashRevealed, 800);
        exit.value = withDelay(
          800,
          withTiming(1, { duration: 280 }, (finished) => {
            if (finished) runOnJS(onDone)();
          })
        );
        return;
      }

      road.value = withDelay(120, withTiming(1, { duration: 720, easing: EXPO_OUT }));
      glow.value = withDelay(260, withTiming(1, { duration: 640, easing: EXPO_OUT }));
      // Overshoot then settle: the second leg is shorter, so it reads as
      // weight coming to rest rather than a bounce.
      lift.value = withDelay(
        320,
        withSequence(
          withTiming(1.07, { duration: 440, easing: EXPO_OUT }),
          withTiming(1, { duration: 200, easing: EXPO_OUT })
        )
      );
      word.value = withDelay(560, withTiming(1, { duration: 520, easing: EXPO_OUT }));
      // Fire as the plate BEGINS to lift, so the page underneath cascades in
      // while the splash rises — the hand-off is one continuous motion.
      timer = setTimeout(markSplashRevealed, 1500);
      exit.value = withDelay(
        1500,
        withTiming(1, { duration: 440, easing: EXPO_OUT }, (finished) => {
          if (finished) runOnJS(onDone)();
        })
      );
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // However this unmounts, the app must never stay gated shut.
      markSplashRevealed();
    };
  }, [road, lift, word, glow, exit, onDone]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    // The plate lifts on the way out, so the app appears to be underneath it
    // rather than replacing it.
    transform: [{ translateY: -exit.value * H * 0.05 }, { scale: 1 + exit.value * 0.03 }]
  }));

  // SVG geometry travels as an animated prop — Reanimated writes styles into
  // an object react-native-svg never reads, and the line would just appear.
  const roadProps = useAnimatedProps(() => ({
    strokeDashoffset: ROAD_LEN * (1 - road.value),
    opacity: interpolate(road.value, [0, 0.15, 1], [0, 1, 0.5])
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.8,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.5, 1]) }]
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1.07], [0, -LIFT * 1.07]) },
      { scale: interpolate(lift.value, [0, 1.07], [1, 1.035]) }
    ]
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [16, 0]) }]
  }));

  const vignetteStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.55 }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.shell, shellStyle]} pointerEvents="none">
      {/* Ground vignette, arriving with the glow — one light source, not two
          competing fades. The base stays the launch screen's exact navy. */}
      <Animated.View style={[StyleSheet.absoluteFill, vignetteStyle]}>
        <GradientFill
          colors={["rgba(6,23,38,0)", "rgba(6,23,38,0)", "rgba(6,23,38,0.9)"]}
          locations={[0, 0.45, 1]}
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

      {/* Warm bloom behind the mark, so it sits in light on a flat field. */}
      <Animated.View style={[styles.glow, glowStyle]}>
        <RadialGlow color="#f5a623" opacity={0.26} />
      </Animated.View>

      {/* The mark: pixel-identical to the native launch screen at t=0. */}
      <Animated.View style={[styles.markWrap, markStyle]}>
        <Image source={require("@/assets/images/mark.png")} style={styles.mark} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.wordWrap, wordStyle]}>
        <Image
          source={require("@/assets/images/wordmark-type.png")}
          style={styles.word}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: color.brand900, zIndex: 100 },
  glow: {
    position: "absolute",
    top: H / 2 - W * 0.55,
    left: W / 2 - W * 0.55,
    width: W * 1.1,
    height: W * 1.1
  },
  markWrap: {
    position: "absolute",
    top: H / 2 - MARK_H / 2,
    left: W / 2 - MARK_W / 2
  },
  mark: { width: MARK_W, height: MARK_H },
  wordWrap: {
    position: "absolute",
    // Sits under the lifted mark: centre + (MARK_H/2 − LIFT) + breathing room.
    top: H / 2 + MARK_H / 2 - LIFT + 22,
    left: W / 2 - WORD_W / 2
  },
  word: { width: WORD_W, height: WORD_H }
});
