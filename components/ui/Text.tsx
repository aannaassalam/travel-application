import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from "react-native";
import { color, font, type as typeScale } from "@/theme/tokens";

type Variant = keyof typeof typeScale;
type Weight = "regular" | "medium" | "semibold" | "bold";

/**
 * Every string in the app goes through here.
 *
 * React Native has no cascade, so without a single typed component each screen
 * re-declares its own font stack and the scale drifts within a week. `display`
 * switches to Fraunces for headlines only — body copy stays on Inter, exactly
 * as on the website.
 */
export function Text({
  variant = "base",
  weight = "regular",
  display,
  tone = "ink900",
  center,
  style,
  ...props
}: RNTextProps & {
  variant?: Variant;
  weight?: Weight;
  display?: boolean;
  tone?: keyof typeof color;
  center?: boolean;
}) {
  return (
    <RNText
      // Dynamic Type is on by default: the token sizes are the 100% baseline,
      // not a ceiling. Anything that must not grow opts out at its call site.
      {...props}
      style={[
        typeScale[variant],
        {
          fontFamily: display ? (weight === "bold" ? font.displayBold : font.display) : font[weight],
          color: color[tone]
        },
        center && styles.center,
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: "center" } });
