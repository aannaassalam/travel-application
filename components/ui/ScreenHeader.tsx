import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { color, space } from "@/theme/tokens";

/**
 * A detail-screen header that arrives as you scroll past the hero.
 *
 * Large titles collapse to inline on scroll on iOS, and this is the same idea
 * over a photograph: the bar is invisible while the image is doing the work,
 * and fades in with a material behind it once the title would otherwise be
 * scrolling into the notch.
 *
 * The back control sits outside the fade so it is always hit-able — a back
 * button that is invisible at the top of a screen is the fastest way to trap
 * someone, and the edge-swipe gesture is not obvious to everyone.
 */
export function ScreenHeader({
  title,
  scrollY,
  threshold = 180
}: {
  title: string;
  scrollY: SharedValue<number>;
  threshold?: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const plate = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [threshold - 60, threshold], [0, 1], Extrapolation.CLAMP)
  }));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, plate]}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.hairline} />
      </Animated.View>

      <View style={styles.row}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
          <ChevronLeft size={22} color={color.brand900} strokeWidth={2.4} />
        </Pressable>
        <Animated.View style={[styles.titleWrap, plate]} pointerEvents="none">
          <Text variant="base" weight="bold" tone="brand900" numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
        <View style={styles.back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  hairline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.ink100
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
  titleWrap: { flex: 1, alignItems: "center" }
});
