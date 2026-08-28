import { useQuery } from "@tanstack/react-query";
import { useAppNavigation } from "@/navigation/types";
import {
  Bus,
  Car,
  ChevronRight,
  Compass,
  Hotel as HotelIcon,
  Plane,
  ShoppingBag
} from "lucide-react-native";
import { FlatList, Image, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_CLEARANCE } from "@/components/TabBar";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { myOrders } from "@/lib/api";
import { useRefresh } from "@/lib/useRefresh";
import { fmtDate } from "@/lib/format";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, radius, space, verticalColor } from "@/theme/tokens";
import type { Order } from "@/types/domain";

/**
 * Bookings.
 *
 * Each card answers the three questions a customer actually has, at a glance:
 * what did I book, when is it, and — the one that matters most in a cash
 * economy — is it paid. Status and payment are separate badges, exactly like
 * the website: "confirmed but unpaid" is a real state and hiding half of it
 * is how someone shows up to a counter with no ticket.
 */

const VERTICAL_ICON: Record<string, typeof Plane> = {
  FLIGHT: Plane,
  HOTEL: HotelIcon,
  BUS: Bus,
  CAR: Car,
  ACTIVITY: Compass,
  RESTAURANT: ShoppingBag
};

const TONE: Record<string, { bg: string; fg: string }> = {
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
  const tone = TONE[code] ?? { bg: color.ink100, fg: color.ink700 };
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text variant="2xs" weight="bold" style={{ color: tone.fg }}>
        {label}
      </Text>
    </View>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t, locale, currency } = usePrefs();
  const first = order.items[0];
  const Icon = VERTICAL_ICON[first?.vertical ?? ""] ?? Plane;
  const tint = verticalColor[first?.vertical ?? "FLIGHT"] ?? color.brand500;
  const when = first?.startDate ?? order.createdAt;
  const extra = order.items.length - 1;

  return (
    <Pressable onPress={onPress} scaleTo={0.985} accessibilityLabel={order.reference}>
      <Surface style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconDot, { backgroundColor: `${tint}1A` }]}>
            <Icon size={18} color={tint} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="base" weight="bold" tone="brand900" numberOfLines={1}>
              {first?.listingLabel ?? order.reference}
              {extra > 0 ? `  +${extra}` : ""}
            </Text>
            <Text variant="xs" tone="ink500" style={styles.mono}>
              {order.reference}
              {when ? ` · ${fmtDate(when, locale)}` : ""}
            </Text>
          </View>
          <ChevronRight size={18} color={color.ink300} strokeWidth={2.2} />
        </View>

        <View style={styles.cardFoot}>
          <View style={styles.badges}>
            <Badge label={t(`status.${order.status}`)} code={order.status} />
            <Badge label={t(`pay.${order.paymentStatus}`)} code={order.paymentStatus} />
          </View>
          <Text variant="md" weight="bold" tone="brand900">
            {price(order.total, currency, locale)}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

export default function TripsScreen() {
  const { t } = usePrefs();
  const { customer, ready } = useSession();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();

  const { data, isPending, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: myOrders,
    // Only ask when there is a session to ask with; an anonymous call would
    // 401 and clear a token that was never there.
    enabled: Boolean(customer)
  });
  // A disabled query reports pending forever, which left the signed-out
  // screen entirely blank — no orders, no empty state, nothing.
  const settled = customer ? !isPending : true;
  const { refreshing, onRefresh } = useRefresh(refetch);

  const items = data?.items ?? [];

  return (
    <FlatList
      style={styles.screen}
      data={customer ? items : []}
      keyExtractor={(o) => o.reference}
      // The one list whose truth changes without the customer doing anything:
      // the office confirms, payment lands. Pulling is how they check.
      refreshControl={
        customer ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand500} />
        ) : undefined
      }
      contentContainerStyle={{
        paddingTop: insets.top + space[4],
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + space[8],
        paddingHorizontal: space[5],
        gap: space[3]
      }}
      ListHeaderComponent={
        <Reveal>
          <Text variant="2xl" weight="bold" display tone="brand900" style={{ marginBottom: space[4] }}>
            {t("trips.title")}
          </Text>
        </Reveal>
      }
      renderItem={({ item, index }) => (
        <Reveal index={index}>
          <OrderCard
            order={item}
            onPress={() => navigation.navigate("Order", { reference: item.reference })}
          />
        </Reveal>
      )}
      ListEmptyComponent={
        ready && settled ? (
          <View style={styles.empty}>
            <Image
              source={require("@/assets/images/illustrations/empty-trips.png")}
              style={styles.emptyArt}
              resizeMode="contain"
            />
            <Text variant="md" weight="bold" tone="brand900" center style={{ marginTop: space[3] }}>
              {customer ? t("trips.empty") : t("account.signedOut")}
            </Text>
            <Text variant="sm" tone="ink700" center style={{ marginTop: space[2] }}>
              {t("trips.emptyBody")}
            </Text>
            {!customer ? (
              <Button
                label={t("account.signIn")}
                onPress={() => navigation.navigate("Login")}
                style={{ marginTop: space[5] }}
              />
            ) : null}
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  card: { padding: space[4], gap: space[3] },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space[3] },
  iconDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  mono: { fontVariant: ["tabular-nums"], marginTop: 2 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: color.ink100,
    paddingTop: space[3]
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[1.5] },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: space[1] },
  emptyArt: { width: 170, height: 170 },
  empty: {
    alignItems: "center",
    paddingVertical: space[12],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
