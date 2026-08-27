import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Bike, Clock, Star, UtensilsCrossed } from "lucide-react-native";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Pressable } from "@/components/ui/Pressable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { CartBar } from "@/components/CartBar";
import { searchRestaurants } from "@/lib/api";
import { firstMedia } from "@/lib/media";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space } from "@/theme/tokens";
import type { Restaurant } from "@/types/domain";

export default function RestaurantsScreen() {
  const { t, locale, currency, lz } = usePrefs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { city } = useLocalSearchParams<{ city?: string }>();

  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ["restaurants", city ?? ""],
    queryFn: () => searchRestaurants({ city, limit: 40 })
  });

  const items = data?.items ?? [];

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[24] }
        ]}
        showsVerticalScrollIndicator={false}
        // Pull to refresh: a menu can be 86'd while the customer is looking at
        // it, and this is the gesture people already try.
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={color.brand500} />
        }
        ListHeaderComponent={
          <Reveal>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {t("nav.restaurants")}
            </Text>
            {!isPending && (
              <Text variant="sm" tone="ink500" style={styles.count}>
                {city ? `${city} · ` : ""}
                {data?.total ?? 0} {t("results.count")}
              </Text>
            )}
          </Reveal>
        }
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <RestaurantCard
              restaurant={item}
              currency={currency}
              locale={locale}
              name={lz(item.name)}
              description={lz(item.description)}
              onPress={() => router.push(`/restaurant/${item.slug}`)}
            />
          </Reveal>
        )}
        ListEmptyComponent={
          isPending ? (
            <View style={{ gap: space[4] }}>
              {[0, 1, 2].map((i) => (
                <Surface key={i} style={styles.skeletonCard}>
                  <Skeleton style={styles.skeletonImage} />
                  <View style={{ padding: space[4], gap: space[2] }}>
                    <Skeleton style={{ height: 18, width: "60%" }} />
                    <Skeleton style={{ height: 12, width: "85%" }} />
                    <Skeleton style={{ height: 12, width: "40%" }} />
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            /* §1: an empty result says what to do next, never just "0". */
            <View style={styles.empty}>
              <UtensilsCrossed size={32} color={color.brand500} strokeWidth={1.8} />
              <Text variant="md" weight="bold" tone="brand900" center style={{ marginTop: space[3] }}>
                {isError ? t("common.error") : t("results.none")}
              </Text>
              <Text variant="sm" tone="ink700" center style={{ marginTop: space[2] }}>
                {isError ? t("common.retry") : t("results.noneBody")}
              </Text>
            </View>
          )
        }
      />
      <CartBar />
    </View>
  );
}

function RestaurantCard({
  restaurant: r,
  currency,
  locale,
  name,
  description,
  onPress
}: {
  restaurant: Restaurant;
  currency: Parameters<typeof price>[1];
  locale: string;
  name: string;
  description: string;
  onPress: () => void;
}) {
  // The cheapest zone: the number a customer weighs before tapping in.
  const cheapest = r.deliveryZones.length
    ? r.deliveryZones.reduce((a, b) => ((a.fee.USD ?? 0) <= (b.fee.USD ?? 0) ? a : b))
    : null;

  return (
    <Pressable onPress={onPress} scaleTo={0.985} accessibilityLabel={name}>
      <Surface style={styles.card}>
        <Image
          source={firstMedia(r.images)}
          style={styles.cardImage}
          contentFit="cover"
          transition={220}
          placeholder={{ blurhash: "L6Ec:*00~q00%M%M%M%M00%M%M%M" }}
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text variant="md" weight="bold" tone="brand900" style={{ flex: 1 }} numberOfLines={1}>
              {name}
            </Text>
            {r.rating ? (
              <View style={styles.rating}>
                <Star size={14} color={color.accent500} fill={color.accent500} />
                <Text variant="sm" weight="semibold" tone="ink700">
                  {r.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="sm" tone="ink500" numberOfLines={1}>
            {[...r.cuisines, r.city].filter(Boolean).join(" · ")}
          </Text>
          <Text variant="sm" tone="ink500" numberOfLines={2}>
            {description}
          </Text>

          <View style={styles.meta}>
            {cheapest ? (
              <View style={styles.metaItem}>
                <Bike size={15} color={color.brand500} strokeWidth={2.2} />
                <Text variant="sm" tone="ink700">
                  {price(cheapest.fee, currency, locale)}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Clock size={15} color={color.brand500} strokeWidth={2.2} />
              <Text variant="sm" tone="ink700">
                {r.prepTimeMinutes + (cheapest?.etaMinutes ?? 0)} min
              </Text>
            </View>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  list: { paddingHorizontal: space[5], gap: space[4] },
  count: { marginTop: space[1], marginBottom: space[2] },
  card: { overflow: "hidden" },
  cardImage: { width: "100%", height: 150, backgroundColor: color.ink50 },
  cardBody: { padding: space[4], gap: space[1] },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space[2] },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  meta: { flexDirection: "row", gap: space[4], marginTop: space[2] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  skeletonCard: { overflow: "hidden" },
  skeletonImage: { height: 150, borderRadius: 0 },
  empty: {
    alignItems: "center",
    paddingVertical: space[16],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
