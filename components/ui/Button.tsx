import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import { Text } from "@/components/ui/Text";
import { color, radius, shadow, space } from "@/theme/tokens";

type Variant = "primary" | "dark" | "outline" | "quiet";
type Size = "sm" | "md" | "lg";

/**
 * Amber is the call to action and nothing else — a CTA is never the same hue as
 * a header or a link. `dark` is the secondary, `outline` the tertiary, `quiet`
 * the one that has to disappear into a sheet.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  full,
  style
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: object;
}) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === "primary" ? "medium" : "light"}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      accessibilityLabel={label}
      style={[styles.base, v.container, s.container, full && styles.full, style] as never}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <>
            {icon}
            <Text weight="bold" variant={s.variant} style={{ color: v.text }}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { container: object; text: string }> = {
  primary: {
    container: { backgroundColor: color.accent500, ...shadow.sm },
    text: color.brand900
  },
  dark: { container: { backgroundColor: color.brand900, ...shadow.sm }, text: color.white },
  outline: {
    container: { backgroundColor: color.white, borderWidth: 1.5, borderColor: color.ink200 },
    text: color.brand700
  },
  quiet: { container: { backgroundColor: color.ink50 }, text: color.ink700 }
};

const SIZES: Record<Size, { container: object; variant: "sm" | "base" | "md" }> = {
  sm: { container: { height: 40, paddingHorizontal: space[4] }, variant: "sm" },
  // 52 rather than the 44pt floor: a primary action wants to be comfortably
  // bigger than the minimum, not exactly at it.
  md: { container: { height: 52, paddingHorizontal: space[5] }, variant: "base" },
  lg: { container: { height: 58, paddingHorizontal: space[6] }, variant: "md" }
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  full: { alignSelf: "stretch" }
});
