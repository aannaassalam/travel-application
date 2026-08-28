import { useAppNavigation } from "@/navigation/types";
import { ChevronUp, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react-native";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { useCart } from "@/lib/cart";
import { multiply, price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, shadow, space } from "@/theme/tokens";

/**
 * The basket, as a bar above the tab bar plus a sheet holding the lines.
 *
 * "Two items, $15" is enough while you are still choosing, and not enough to
 * commit on — the moment before checkout is exactly when someone wants to see
 * WHAT the two items are. On a phone that belongs in a sheet rather than an
 * inline expansion: the list can be long, it needs its own scroll, and a
 * downward swipe is how people already close things.
 *
 * The bar sits ABOVE the tab bar rather than replacing it, so the customer can
 * still leave for another tab with a basket in hand.
 */
export function CartBar({
  bottomOffset = 0,
  insetBottom = false
}: {
  /** Distance from the bottom of the SCREEN AREA the bar floats at. Inside a
   *  tab screen the tab bar already ends the area, so a small offset is right;
   *  a stack screen reaches the physical edge, so `insetBottom` adds the safe
   *  area on top. */
  bottomOffset?: number;
  insetBottom?: boolean;
}) {
  const { t, locale, currency } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const sheet = useRef<SheetHandle>(null);
  const {
    ready,
    lines,
    count,
    subtotal,
    restaurantName,
    setQuantity,
    remove,
    pending,
    confirmReplace,
    cancelReplace
  } = useCart();

  const showBar = ready && count > 0;

  /**
   * The bar's entrance is a shared-value style, NOT the entering/exiting API.
   * On this RN/Reanimated pairing a view mounted through `entering` can come
   * up with broken hit-testing — the bar appeared but neither the summary nor
   * Checkout responded to a single tap. Style-driven animation keeps the
   * native view an ordinary one, and ordinary views take touches.
   */
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(showBar ? 1 : 0, {
      duration: 320,
      easing: Easing.bezier(0.16, 1, 0.3, 1)
    });
  }, [showBar, shown]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: interpolate(shown.value, [0, 1], [24, 0]) }]
  }));

  return (
    <>
      {showBar && (
        <Animated.View
          style={[
            styles.bar,
            { bottom: bottomOffset + (insetBottom ? insets.bottom : 0) + space[3] },
            barStyle
          ]}
        >
          <View style={styles.barRow}>
            <Pressable
              onPress={() => sheet.current?.open()}
              style={styles.summary}
              haptic="selection"
              accessibilityLabel={t("cart.title")}
              accessibilityHint={`${count} · ${price(subtotal, currency, locale)}`}
            >
              <ChevronUp size={20} color={color.brand700} strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text variant="sm" weight="bold" tone="brand900" numberOfLines={1}>
                  {restaurantName}
                </Text>
                <Text variant="sm" tone="ink500">
                  {count} · {price(subtotal, currency, locale)}
                </Text>
              </View>
            </Pressable>
            <Button
              label={t("cart.checkout")}
              icon={<ShoppingBag size={16} color={color.brand900} strokeWidth={2.4} />}
              onPress={() => navigation.navigate("Checkout")}
              size="sm"
            />
          </View>
        </Animated.View>
      )}

      <Sheet ref={sheet} title={t("cart.title")} scrollable snapPoints={["55%", "85%"]}>
        <View style={{ gap: space[1] }}>
          {lines.map((l) => (
            <View key={l.menuItemId} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text variant="base" weight="semibold" tone="ink900" numberOfLines={1}>
                  {l.name}
                </Text>
                <Text variant="xs" tone="ink500">
                  {price(l.unitPrice, currency, locale)}
                </Text>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQuantity(l.menuItemId, l.quantity - 1)}
                  style={styles.stepBtn}
                  haptic="selection"
                  accessibilityLabel={`−1 ${l.name}`}
                >
                  <Minus size={15} color={color.brand900} strokeWidth={2.6} />
                </Pressable>
                <Text variant="sm" weight="bold" tone="brand900" style={styles.qty}>
                  {l.quantity}
                </Text>
                <Pressable
                  onPress={() => setQuantity(l.menuItemId, l.quantity + 1)}
                  style={styles.stepBtn}
                  haptic="selection"
                  accessibilityLabel={`+1 ${l.name}`}
                >
                  <Plus size={15} color={color.brand900} strokeWidth={2.6} />
                </Pressable>
              </View>

              {/* The line total, not the unit price — this is the number people
                  are actually adding up in their head. */}
              <Text variant="sm" weight="bold" tone="brand900" style={styles.lineTotal}>
                {price(multiply(l.unitPrice, l.quantity), currency, locale)}
              </Text>

              <Pressable
                onPress={() => remove(l.menuItemId)}
                style={styles.trash}
                accessibilityLabel={`${t("common.close")} ${l.name}`}
              >
                <Trash2 size={17} color={color.ink500} strokeWidth={2.2} />
              </Pressable>
            </View>
          ))}

          <Text variant="xs" tone="ink500" style={{ marginTop: space[3] }}>
            {t("cart.deliveryNote")}
          </Text>

          <Button
            label={t("cart.checkout")}
            // Deleting the last line leaves the sheet open with nothing to
            // check out; the button must say so instead of leading to an
            // empty screen.
            disabled={count === 0}
            onPress={() => {
              sheet.current?.close();
              navigation.navigate("Checkout");
            }}
            full
            style={{ marginTop: space[4] }}
          />
        </View>
      </Sheet>

      {/* Asked, never assumed: the API refuses an order spanning two kitchens,
          so adding from a second one has to replace the basket — and doing that
          silently would throw away a basket somebody had built. */}
      {pending ? (
        <View style={styles.dialogWrap}>
          <Pressable
            onPress={cancelReplace}
            style={StyleSheet.absoluteFill as never}
            haptic="none"
            accessibilityLabel={t("common.close")}
          >
            <View style={styles.scrim} />
          </Pressable>
          <View style={styles.dialog}>
            <Text variant="lg" weight="bold" tone="brand900">
              {t("cart.empty")}?
            </Text>
            <Text variant="sm" tone="ink700" style={{ marginTop: space[2] }}>
              {t("cart.oneKitchen")}
            </Text>
            <View style={styles.dialogActions}>
              <Button label={t("cart.keep")} variant="outline" onPress={cancelReplace} />
              <Button label={t("cart.emptyAndAdd")} variant="dark" onPress={confirmReplace} />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: space[4],
    right: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.ink100,
    ...shadow.lg
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3]
  },
  summary: { flex: 1, flexDirection: "row", alignItems: "center", gap: space[2] },
  line: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3] },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.brand50,
    borderRadius: radius.sm,
    padding: 2
  },
  stepBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  qty: { width: 22, textAlign: "center" },
  lineTotal: { width: 74, textAlign: "right" },
  trash: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  dialogWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    justifyContent: "center",
    padding: space[6]
  },
  scrim: { flex: 1, backgroundColor: "rgba(10,37,64,0.45)" },
  dialog: { backgroundColor: color.white, borderRadius: radius.xl2, padding: space[6], ...shadow.xl },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: space[3], marginTop: space[6] }
});
