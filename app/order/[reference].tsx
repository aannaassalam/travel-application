import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bike, CheckCircle2 } from "lucide-react-native";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getOrder } from "@/lib/api";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";

/**
 * Confirmation.
 *
 * The reference is the largest thing on the screen because it is what the
 * customer reads out on the phone and shows to a driver — every other number
 * here is secondary to being able to quote it.
 */
export default function OrderScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { t, locale, currency } = usePrefs();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isPending } = useQuery({
    queryKey: ["order", reference],
    queryFn: () => getOrder(String(reference)),
    enabled: Boolean(reference)
  });

  const order = data?.order;

  if (isPending || !order) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={color.brand500} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + space[10],
        paddingBottom: insets.bottom + space[10],
        paddingHorizontal: space[5]
      }}
    >
      {/* The one celebratory beat in the app, and it is earned: this is the
          moment the customer has committed money. It is a single scale-in,
          not confetti. */}
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.tick}>
        <CheckCircle2 size={54} color={color.ok600} strokeWidth={2} />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(180).duration(420)}>
        <Text variant="xl" weight="bold" display tone="brand900" center>
          {order.paymentMethod === "CASH" ? t("checkout.payCash") : t("checkout.title")}
        </Text>
      </Animated.View>

      <Reveal index={1} style={{ marginTop: space[6] }}>
        <Surface padded style={styles.refCard}>
          <Text variant="xs" weight="semibold" tone="ink500" style={styles.refLabel}>
            {t("trips.title")}
          </Text>
          <Text variant="2xl" weight="bold" tone="brand900" style={styles.ref}>
            {order.reference}
          </Text>
        </Surface>
      </Reveal>

      {order.delivery ? (
        <Reveal index={2}>
          <Surface padded style={styles.card}>
            <View style={styles.row}>
              <Bike size={17} color={color.brand500} strokeWidth={2.2} />
              <Text variant="sm" weight="bold" tone="brand900">
                {t("cart.delivery")}
              </Text>
            </View>
            <Text variant="base" tone="ink900" style={{ marginTop: space[2] }}>
              {order.delivery.address}
            </Text>
            <Text variant="sm" tone="ink500" style={{ marginTop: space[1] }}>
              {order.delivery.zoneName}
              {order.delivery.etaMinutes ? ` · ${order.delivery.etaMinutes} min` : ""}
            </Text>
          </Surface>
        </Reveal>
      ) : null}

      <Reveal index={3}>
        <Surface padded style={styles.card}>
          {order.items.map((i, n) => (
            <View key={`${i.listingLabel}-${n}`} style={styles.itemRow}>
              <Text variant="sm" tone="ink700" style={{ flex: 1 }} numberOfLines={1}>
                {i.quantity}× {i.listingLabel}
              </Text>
              <Text variant="sm" weight="semibold" tone="ink900">
                {price(i.lineTotal, currency, locale)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text variant="base" weight="bold" tone="brand900" style={{ flex: 1 }}>
              {t("cart.total")}
            </Text>
            <Text variant="md" weight="bold" tone="brand900">
              {price(order.total, currency, locale)}
            </Text>
          </View>
        </Surface>
      </Reveal>

      <Button
        label={t("tab.trips")}
        variant="outline"
        onPress={() => router.replace("/(tabs)/trips")}
        style={{ marginTop: space[8] }}
        full
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.paper },
  tick: { alignItems: "center", marginBottom: space[5] },
  refCard: { alignItems: "center", backgroundColor: color.brand50 },
  refLabel: { textTransform: "uppercase", letterSpacing: 0.6 },
  // Tabular figures and wide tracking: this string gets read aloud down a phone
  // line, so every character has to be individually unambiguous.
  ref: { letterSpacing: 2, marginTop: space[2], fontVariant: ["tabular-nums"] },
  card: { marginTop: space[4] },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  itemRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2] },
  divider: { height: 1, backgroundColor: color.ink100, marginVertical: space[2] }
});
