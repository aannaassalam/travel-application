import { Skeleton } from "@/components/ui/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useAppNavigation, type RootStackParamList } from "@/navigation/types";
import { Bike, CheckCircle2, Circle, Clock3 } from "lucide-react-native";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getOrder } from "@/lib/api";
import { useRefresh } from "@/lib/useRefresh";
import { fmtDate, fmtDateTime } from "@/lib/format";
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
/** §4.3: three independent axes, three independent badges — never one word. */
const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  CONFIRMED: { bg: color.ok100, fg: color.ok600 },
  COMPLETED: { bg: color.ok100, fg: color.ok600 },
  SUBMITTED: { bg: color.warn100, fg: color.warn600 },
  DRAFT: { bg: color.ink100, fg: color.ink700 },
  CANCELLED: { bg: color.bad100, fg: color.bad600 },
  PAID: { bg: color.ok100, fg: color.ok600 },
  PENDING: { bg: color.warn100, fg: color.warn600 },
  UNPAID: { bg: color.warn100, fg: color.warn600 },
  FAILED: { bg: color.bad100, fg: color.bad600 },
  REVERSED: { bg: color.bad100, fg: color.bad600 }
};

function Badge({ label, code }: { label: string; code: string }) {
  const tone = STATUS_TONE[code] ?? { bg: color.ink100, fg: color.ink700 };
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text variant="2xs" weight="bold" style={{ color: tone.fg }}>
        {label}
      </Text>
    </View>
  );
}

export default function OrderScreen() {
  const { reference } = useRoute<RouteProp<RootStackParamList, "Order">>().params;
  const { t, locale, currency } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();

  const { data, isPending, refetch } = useQuery({
    queryKey: ["order", reference],
    queryFn: () => getOrder(reference),
    enabled: Boolean(reference)
  });
  const { refreshing, onRefresh } = useRefresh(refetch);

  const order = data?.order;

  if (isPending || !order) {
    return (
      <View style={styles.centre}>
        <View style={styles.skeletonPage}>
          <Skeleton style={styles.skeletonHero} />
          <View style={styles.skeletonBody}>
            <Skeleton style={styles.skeletonTitle} />
            <Skeleton style={styles.skeletonMeta} />
            <Skeleton style={styles.skeletonLine} />
            <Skeleton style={styles.skeletonBlock} />
            <Skeleton style={styles.skeletonBlock} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      // Someone waiting on "Paid" or "Documents issued" re-checks this page;
      // a pull answers them without leaving it.
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand500} />
      }
      contentContainerStyle={{
        paddingTop: insets.top + space[10],
        paddingBottom: insets.bottom + space[10],
        paddingHorizontal: space[5]
      }}
    >
      {/* The one celebratory beat in the app, and it is earned — but the
          illustration carries the joy itself; the motion just delivers it.
          A quiet rise with an exponential settle, no spring, no zoom. */}
      <Animated.View
        entering={FadeInDown.duration(550).easing(Easing.bezier(0.16, 1, 0.3, 1))}
        style={styles.tick}
      >
        <Image
          source={require("@/assets/images/illustrations/order-success.png")}
          style={styles.tickArt}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(180).duration(420)}>
        <Text variant="xl" weight="bold" display tone="brand900" center>
          {t("order.done")}
        </Text>
      </Animated.View>

      <Reveal index={1} style={{ marginTop: space[6] }}>
        <Surface padded style={styles.refCard}>
          <Text variant="xs" weight="semibold" tone="ink500" style={styles.refLabel}>
            {t("order.reference")}
          </Text>
          <Text variant="2xl" weight="bold" tone="brand900" style={styles.ref}>
            {order.reference}
          </Text>
          <View style={styles.badges}>
            <Badge label={t(`status.${order.status}`)} code={order.status} />
            <Badge label={t(`pay.${order.paymentStatus}`)} code={order.paymentStatus} />
            <Badge label={t(`ful.${order.fulfilmentStatus}`)} code={order.fulfilmentStatus} />
          </View>
        </Surface>
      </Reveal>

      {order.paymentMethod === "CASH" && order.paymentStatus === "UNPAID" ? (
        <Reveal index={2}>
          <Surface padded style={[styles.card, styles.cashCard]}>
            <View style={styles.row}>
              <Clock3 size={17} color={color.warn600} strokeWidth={2.2} />
              <Text variant="sm" weight="bold" tone="ink900" style={{ flex: 1 }}>
                {t("checkout.cashNote")}
              </Text>
            </View>
            {order.cashDeadline ? (
              <Text variant="sm" tone="ink700" style={{ marginTop: space[2] }}>
                {fmtDateTime(order.cashDeadline, locale)}
              </Text>
            ) : null}
          </Surface>
        </Reveal>
      ) : null}

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
              <View style={{ flex: 1 }}>
                <Text variant="sm" weight="semibold" tone="ink900" numberOfLines={2}>
                  {i.quantity}× {i.listingLabel}
                </Text>
                {i.startDate ? (
                  <Text variant="xs" tone="ink500">
                    {fmtDate(i.startDate, locale)}
                    {i.endDate && i.endDate !== i.startDate
                      ? ` → ${fmtDate(i.endDate, locale)}`
                      : ""}
                  </Text>
                ) : null}
              </View>
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

      {order.travellers?.length ? (
        <Reveal index={4}>
          <Surface padded style={styles.card}>
            <Text variant="sm" weight="bold" tone="brand900" style={{ marginBottom: space[2] }}>
              {t("booking.travellers")}
            </Text>
            {order.travellers.map((tr, i) => (
              <Text key={i} variant="sm" tone="ink700">
                {tr.firstName} {tr.lastName}
                {tr.documentNumberMasked ? ` · ${tr.documentNumberMasked}` : ""}
              </Text>
            ))}
          </Surface>
        </Reveal>
      ) : null}

      {order.timeline?.length ? (
        <Reveal index={5}>
          <Surface padded style={styles.card}>
            <Text variant="sm" weight="bold" tone="brand900" style={{ marginBottom: space[3] }}>
              {t("order.timeline")}
            </Text>
            <View style={{ gap: space[3] }}>
              {order.timeline.map((entry, i) => (
                <View key={i} style={styles.timelineRow}>
                  {i === 0 ? (
                    <CheckCircle2 size={18} color={color.ok600} strokeWidth={2.2} />
                  ) : (
                    <Circle size={18} color={color.brand500} strokeWidth={2.2} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text variant="sm" weight="semibold" tone="ink900">
                      {t(`ev.${entry.event}`) === `ev.${entry.event}`
                        ? entry.event
                        : t(`ev.${entry.event}`)}
                    </Text>
                    <Text variant="xs" tone="ink500">
                      {fmtDateTime(entry.at, locale)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Surface>
        </Reveal>
      ) : null}

      {/* §4.4: no self-service cancel — a button that takes money and returns
          nothing generates disputes. Say how changes actually happen. */}
      <Reveal index={6}>
        <View style={styles.note}>
          <Text variant="xs" tone="ink700">
            {t("order.cancelNote")}
          </Text>
        </View>
      </Reveal>

      <Button
        label={t("tab.trips")}
        variant="outline"
        onPress={() => navigation.navigate("Tabs", { screen: "TripsTab" })}
        style={{ marginTop: space[8] }}
        full
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.paper },
  /** The pending state wears the page's own silhouette — a hero, a title, two
   *  card blocks — so arriving content replaces shapes instead of appearing. */
  skeletonPage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.paper },
  skeletonHero: { height: 180, borderRadius: 0 },
  skeletonBody: { padding: space[5], gap: space[3] },
  skeletonTitle: { height: 26, width: "65%" },
  skeletonMeta: { height: 14, width: "40%" },
  skeletonLine: { height: 14, width: "90%" },
  skeletonBlock: { height: 120 },
  tick: { alignItems: "center", marginBottom: space[4] },
  tickArt: { width: 170, height: 170 },
  refCard: { alignItems: "center", backgroundColor: color.brand50 },
  refLabel: { textTransform: "uppercase", letterSpacing: 0.6 },
  // Tabular figures and wide tracking: this string gets read aloud down a phone
  // line, so every character has to be individually unambiguous.
  ref: { letterSpacing: 2, marginTop: space[2], fontVariant: ["tabular-nums"] },
  card: { marginTop: space[4] },
  cashCard: { backgroundColor: color.warn100 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[3] },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: space[1] },
  timelineRow: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  note: {
    marginTop: space[4],
    backgroundColor: color.ink50,
    borderRadius: radius.md,
    padding: space[4]
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  itemRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2] },
  divider: { height: 1, backgroundColor: color.ink100, marginVertical: space[2] }
});
