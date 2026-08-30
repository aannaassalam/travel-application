import { useEffect } from "react";
import { AccessibilityInfo, Dimensions, Image, StyleSheet, View } from "react-native";
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
 *   5. A yellow cab drives up through the screen at one speed and without
 *      stopping — and the navy goes with it, so the home screen is uncovered
 *      from the bottom up in the cab's wake.
 *
 * Stage 5 is the whole point of the rest of it. A fade says the splash is over;
 * a cab driving through says the journey started, which is the one thing a
 * travel app's first seconds should say.
 *
 * Stages 1–4 are exponential ease-outs from an already-visible state. Stage 5
 * is the one linear move in the app: eased motion is how you make a logo feel
 * alive and how you make a vehicle feel dragged on a string. Nor does it pause
 * — traffic does not, and the hold that used to sit in the middle read as a
 * stall. The curtain is not animated at all; it reads its edge off the cab's
 * position, so the reveal cannot drift off the rear bumper.
 *
 * That makes the run about 2.7s, which is long for a splash and is the price
 * of a full-length car crossing a full-length screen at a speed you can read.
 * DRIVE_MS is the dial.
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

/**
 * The cab, drawn rather than shipped: an image of a car at this size would be a
 * megabyte that still softens on a 3x screen. Front points up the screen.
 *
 * A render, not a drawing. Several passes of hand-authored SVG got close to the
 * flat-vector look and never past it: vector art can hold a shape but not
 * glossy paint, a curved reflection or a soft contact shadow, and without those
 * a top-down car reads as a yellow lozenge no matter how many panel lines it
 * carries. `assets/images/taxi-top.png` is a 3D render, cut off its chroma
 * backdrop, its see-through glass recoloured to a navy tint, and its shadow
 * baked in so the cab carries its own ground.
 *
 * `taxi-top-flat.png` sits beside it: the same car in the flat idiom, one line
 * away if the render ever feels too literal against the brand.
 *
 * Sized to the HEIGHT, not the width. A car is roughly twice as long as it is
 * wide, so filling the screen sideways ran it well past the bottom edge: you
 * only ever saw a band of it, and a band of a car is a yellow field. Fitting
 * the length puts the whole vehicle on screen at its true proportions, which is
 * what makes it read as a car at all. Chasing the edges cost more than the
 * margins were worth.
 */
const TAXI_RATIO = 1119 / 538;
const TAXI_H = Math.round(H * 0.84);
const TAXI_W = Math.round(TAXI_H / TAXI_RATIO);

/** One pass at one speed. Distance is the cab's whole journey — from fully
 *  below the screen to fully above it — so the duration sets the speed. Held
 *  near 0.95pt/ms; change the duration and you are changing how fast it drives. */
const DRIVE_DELAY = 820;
const DRIVE_MS = 1600;
/**
 * Where down the cab the navy's edge is pinned, as a fraction of its length.
 *
 * At 1 the curtain ends at the very back of the image and the whole car rides
 * on navy — which reads as a yellow shape towing a blue rectangle, and hides
 * the baked contact shadow completely, since a shadow only exists against
 * something light. Pinning it forward lets the tail and its shadow fall onto the
 * revealed page, so the cab arrives INTO the app instead of dropping a panel in
 * front of it. Around the rear axle rather than the middle: at a true half the
 * cut runs through the roof sign and the car starts to look like a sticker.
 */
const CURTAIN_AT = 0.78;
/** The reveal starts the moment that point clears the bottom edge. */
const REVEAL_AT = DRIVE_DELAY + Math.round((DRIVE_MS * TAXI_H * CURTAIN_AT) / (H + TAXI_H));

/** Headlamp bloom, sized and placed off the lamps rather than the whole car.
 *  Centred a little AHEAD of the lamps — light is thrown forward, and a bloom
 *  centred on the lens just makes the bonnet look wet.
 *
 *  It is deliberately faint. Headlights seen from directly above are spill, not
 *  beam: you are looking at the roof, and what reaches you is the edge of the
 *  throw. Bright enough to read as lit, dim enough not to look like a flare. */
const LAMP = Math.round(TAXI_W * 0.34);
const LAMP_OPACITY = 0.36;
/** The lamps come on once the lockup has finished and the cab is already in
 *  frame, so switching on is its own beat instead of arriving pre-lit. */
const LAMPS_AT = 1150;
const LAMPS_MS = 300;
const LAMP_TOP = Math.round(TAXI_H * 0.02) - LAMP / 2;
/** The lamp housings' centres, as a fraction of the DRAWING's width. */
const LAMP_X = [0.28, 0.72];

function TaxiTop() {
  return (
    <Image
      source={require("@/assets/images/taxi-top.png")}
      style={{ width: TAXI_W, height: TAXI_H }}
      resizeMode="contain"
    />
  );
}

export default function Splash({ onDone }: { onDone: () => void }) {
  const road = useSharedValue(0);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);
  const glow = useSharedValue(0);
  const drive = useSharedValue(0);
  const lamps = useSharedValue(0);
  const fade = useSharedValue(0);

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
        // No cab, no travel: the setting asks for none, and a car crossing the
        // screen is the most motion in the app. It dissolves instead.
        timer = setTimeout(markSplashRevealed, 800);
        fade.value = withDelay(
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

      // One pass, one speed, no stop. A car driving past holds its speed; the
      // easings that make a logo feel alive make a vehicle feel like it is
      // being dragged on a string, so this leg is the one linear move in the
      // app. The curtain is not animated separately at all — it reads its
      // position off this value, so the two cannot drift apart.
      drive.value = withDelay(
        DRIVE_DELAY,
        withTiming(1, { duration: DRIVE_MS, easing: Easing.linear }, (finished) => {
          if (finished) runOnJS(onDone)();
        })
      );
      // Lights on, after the lockup has settled and once the cab's nose is
      // already in frame — it noses in dark, then switches on.
      lamps.value = withDelay(LAMPS_AT, withTiming(1, { duration: LAMPS_MS }));
      // Fire when the rear bumper crosses the bottom edge and the reveal
      // actually starts, so the page cascades in behind the cab.
      timer = setTimeout(markSplashRevealed, REVEAL_AT);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // However this unmounts, the app must never stay gated shut.
      markSplashRevealed();
    };
  }, [road, lift, word, glow, drive, lamps, fade, onDone]);

  // Straight through: fully below the screen to fully above it, no stop.
  const taxiStyle = useAnimatedStyle(() => ({
    opacity: fade.value ? 0 : 1,
    transform: [{ translateY: interpolate(drive.value, [0, 1], [H, -TAXI_H]) }]
  }));

  // The blooms travel with the cab but fade in on their own clock, so the
  // lamps switch on rather than arriving already lit.
  const lampStyle = useAnimatedStyle(() => ({
    opacity: fade.value ? 0 : lamps.value,
    transform: [{ translateY: interpolate(drive.value, [0, 1], [H, -TAXI_H]) }]
  }));

  // The navy is a curtain, not a fade, and its edge is pinned to a point on the
  // cab — derived from the same value rather than animated alongside it, so the
  // two can never fall out of step. The clamp holds it shut until that point has
  // actually cleared the bottom of the screen.
  const plateStyle = useAnimatedStyle(() => ({
    opacity: 1 - fade.value,
    transform: [
      {
        translateY: Math.min(
          0,
          interpolate(drive.value, [0, 1], [H, -TAXI_H]) + TAXI_H * CURTAIN_AT - H
        )
      }
    ]
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

  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.55
  }));

  return (
    // The outer layer carries no colour of its own — it is only a stacking
    // context. The navy belongs to the curtain, which has to be able to leave.
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.plate, plateStyle]}>
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
          <Image
            source={require("@/assets/images/mark.png")}
            style={styles.mark}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.wordWrap, wordStyle]}>
          <Image
            source={require("@/assets/images/wordmark-type.png")}
            style={styles.word}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>

      {/* Two blooms thrown by the lamps, not a halo around the car. Light comes
          from the headlights or it comes from nowhere; a glow wrapped round the
          whole vehicle makes it a sticker lit from behind. They ride the cab's
          transform on their own layers because they sit ahead of its box, and
          Android clips a child that leaves its parent's bounds — which would
          put a hard square edge on the one thing that must not have one. */}
      <Animated.View style={[styles.lampLeft, lampStyle]}>
        <RadialGlow color="#ffeab8" opacity={LAMP_OPACITY} />
      </Animated.View>
      <Animated.View style={[styles.lampRight, lampStyle]}>
        <RadialGlow color="#ffeab8" opacity={LAMP_OPACITY} />
      </Animated.View>

      {/* Outside the curtain, so it stays on screen while the navy slides out
          from under it — the cab is what does the revealing. */}
      <Animated.View style={[styles.taxiWrap, taxiStyle]}>
        <TaxiTop />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100 },
  plate: { backgroundColor: color.brand900 },
  taxiWrap: {
    position: "absolute",
    top: 0,
    left: W / 2 - TAXI_W / 2,
    width: TAXI_W,
    height: TAXI_H
  },
  /** Each bloom sits over its own lamp, in the cab's screen space, so the
   *  shared transform lands them in the right place. */
  lampLeft: {
    position: "absolute",
    width: LAMP,
    height: LAMP,
    left: W / 2 - TAXI_W / 2 + TAXI_W * LAMP_X[0] - LAMP / 2,
    top: LAMP_TOP
  },
  lampRight: {
    position: "absolute",
    width: LAMP,
    height: LAMP,
    left: W / 2 - TAXI_W / 2 + TAXI_W * LAMP_X[1] - LAMP / 2,
    top: LAMP_TOP
  },
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
