import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ticket } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { myOrders } from "@/lib/api";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { color, radius, space } from "@/theme/tokens";

const STATUS_TONE: Record<string, keyof typeof color> = {
  PAID: "ok600",
  UNPAID: "warn600",
  REFUNDED: "ink500"
};

export default function TripsScreen() {
  const { t, locale, currency } = usePrefs();
  const { customer, ready } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isPending } = useQuery({
    queryKey: ["my-orders"],
    queryFn: myOrders,
    // Only ask when there is a session to ask with; an anonymous call would
    // 401 and clear a token that was never there.
    enabled: Boolean(customer)
  });

  const items = data?.items ?? [];

  return (
    <FlatList
      style={styles.screen}
      data={customer ? items : []}
      keyExtractor={(o) => o.reference}
      contentContainerStyle={{
        paddingTop: insets.top + space[4],
        paddingBottom: insets.bottom + space[24],
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
          <Pressable onPress={() => router.push(`/order/${item.reference}`)} scaleTo={0.985}>
            <Surface padded>
              <View style={styles.row}>
                <Text variant="sm" weight="bold" tone="brand900">
                  {item.reference}
                </Text>
                <Text variant="xs" weight="bold" tone={STATUS_TONE[item.paymentStatus] ?? "ink500"}>
                  {item.paymentStatus}
                </Text>
              </View>
              <Text variant="sm" tone="ink700" numberOfLines={1} style={{ marginTop: space[2] }}>
                {item.items.map((i) => `${i.quantity}× ${i.listingLabel}`).join(", ")}
              </Text>
              <Text variant="md" weight="bold" tone="brand900" style={{ marginTop: space[2] }}>
                {price(item.total, currency, locale)}
              </Text>
            </Surface>
          </Pressable>
        </Reveal>
      )}
      ListEmptyComponent={
        ready && !isPending ? (
          <View style={styles.empty}>
            <Ticket size={30} color={color.brand500} strokeWidth={1.8} />
            <Text variant="md" weight="bold" tone="brand900" center style={{ marginTop: space[3] }}>
              {customer ? t("trips.empty") : t("account.signedOut")}
            </Text>
            <Text variant="sm" tone="ink700" center style={{ marginTop: space[2] }}>
              {t("trips.emptyBody")}
            </Text>
            {!customer ? (
              <Button
                label={t("account.signIn")}
                onPress={() => router.push("/(tabs)/account")}
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
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  empty: {
    alignItems: "center",
    paddingVertical: space[16],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
