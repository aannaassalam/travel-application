import { StyleSheet, View, type ViewProps } from "react-native";
import { color, radius, shadow, space } from "@/theme/tokens";

/**
 * A white card on warm paper. The elevation is the low, layered kind — one hard
 * shadow reads as a 2012 card, and Android needs the `elevation` value because
 * it ignores offsets entirely.
 */
export function Surface({ style, padded, ...props }: ViewProps & { padded?: boolean }) {
  return <View {...props} style={[styles.surface, padded && styles.padded, style]} />;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: color.white,
    borderRadius: radius.card,
    ...shadow.sm
  },
  padded: { padding: space[4] }
});
