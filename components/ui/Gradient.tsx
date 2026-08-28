import { StyleSheet } from "react-native";
import Svg, { Defs, Rect, Stop, LinearGradient as SvgGradient, RadialGradient as SvgRadial } from "react-native-svg";

/**
 * A gradient fill that is never a layout container.
 *
 * react-native-linear-gradient goes through Fabric's legacy interop on this
 * RN version, and as a container it mis-applied its own padding as margin and
 * shoved children out of bounds — the broken hero. Drawing the gradient with
 * react-native-svg (Fabric-native, already rendering every icon in the app)
 * and keeping layout in plain Views removes the interop layer from the page
 * structure entirely.
 *
 * Usage: absolutely fills its parent; the parent owns padding, radius and
 * children. Give the parent `overflow: "hidden"` when corners are rounded.
 */
export function GradientFill({
  colors,
  locations,
  horizontal = false
}: {
  colors: string[];
  /** 0..1 stop positions; defaults to an even spread. */
  locations?: number[];
  horizontal?: boolean;
}) {
  const id = `g-${colors.join("-").replace(/[^a-z0-9]/gi, "")}-${horizontal ? "h" : "v"}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
          {colors.map((c, i) => {
            // rgba() strings carry their own alpha, which SVG stops ignore —
            // split it out or the scrim renders fully opaque.
            const m = c.match(/^rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/);
            const stop = locations?.[i] ?? (colors.length === 1 ? 0 : i / (colors.length - 1));
            return m ? (
              <Stop
                key={i}
                offset={stop}
                stopColor={`rgb(${m[1]},${m[2]},${m[3]})`}
                stopOpacity={m[4]}
              />
            ) : (
              <Stop key={i} offset={stop} stopColor={c} stopOpacity={1} />
            );
          })}
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * A soft radial bloom. The linear version inside a rounded container reads as
 * a hard-edged disc — a halo with a visible boundary is decoration, not light.
 * A radial ramp to fully transparent has no edge to see.
 */
export function RadialGlow({ color: glowColor, opacity = 0.3 }: { color: string; opacity?: number }) {
  const id = `r-${glowColor.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgRadial id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={glowColor} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={glowColor} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={glowColor} stopOpacity="0" />
        </SvgRadial>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
