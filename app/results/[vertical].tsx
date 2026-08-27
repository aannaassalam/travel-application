import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SearchX, Star } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reveal } from "@/components/motion/Reveal";
import { Pressable } from "@/components/ui/Pressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { searchHotels, searchListings } from "@/lib/api";
import { firstMedia } from "@/lib/media";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { color, radius, space, verticalColor } from "@/theme/tokens";
import type { Money, Vertical } from "@/types/domain";

/** One shape for both queries, so the row does not care which one filled it. */
interface Row {
  id: string;
  title: string;
  sub: string;
  image?: string;
  money: Money;
  rating?: number;
  onPress: () => void;
}

// Reanimated ships a generic Animated.FlatList; wrapping the plain one with
// createAnimatedComponent loses the item type and forces a cast at every
// callback, which hides real mistakes in the row.
const AnimatedFlatList = Animated.FlatList<Row>;

/**
 * One results screen for every vertical.
 *
 * Hotels come back a different shape from the other five — a property with a
 * from-price rather than a priced listing — so the query splits, but the row
 * does not: a customer comparing a flight and a room should not have to learn
 * two card layouts.
 */
export default function ResultsScreen() {
  const { vertical: raw, destination } = useLocalSearchParams<{
    vertical: string;
    destination?: string;
  }>();
  const vertical = String(raw ?? "").toUpperCase() as Vertical;
  const { t, locale, currency, lz } = usePrefs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const isHotel = vertical === "HOTEL";
  const label = t(`nav.${vertical.toLowerCase()}s`) ?? vertical;

  const hotels = useQuery({
    queryKey: ["hotels", destination ?? ""],
    queryFn: () => searchHotels({ destination, limit: 30 }),
    enabled: isHotel
  });
  const listings = useQuery({
    queryKey: ["listings", vertical, destination ?? ""],
    queryFn: () => searchListings({ vertical, destination, limit: 30 }),
    enabled: !isHotel
  });

  const active = isHotel ? hotels : listings;
  const rows: Row[] = isHotel
    ? (hotels.data?.items ?? []).map((h) => ({
        id: h.id,
        title: lz(h.name),
        sub: [h.address, h.city].filter(Boolean).join(", "),
        image: firstMedia(h.images),
        money: h.fromPrice,
        rating: h.rating,
        onPress: () => router.push(`/hotel/${h.slug}`)
      }))
    : (listings.data?.items ?? []).map((l) => ({
        id: l.id,
        title: lz(l.title),
        sub: l.city,
        image: firstMedia(l.images),
        money: l.sellPrice,
        rating: l.rating,
        onPress: () => {}
      }));

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title={label} scrollY={scrollY} threshold={90} />
      <AnimatedFlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingTop: insets.top + space[12],
          paddingBottom: insets.bottom + space[12],
          paddingHorizontal: space[5],
          gap: space[3]
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Reveal>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {label}
            </Text>
            {!active.isPending && (
              <Text variant="sm" tone="ink500" style={{ marginTop: space[1], marginBottom: space[2] }}>
                {destination ? `${destination} · ` : ""}
                {active.data?.total ?? 0} {t("results.count")}
              </Text>
            )}
          </Reveal>
        }
        renderItem={({ item: r, index }) => {
          return (
            <Reveal index={index}>
              <Pressable onPress={r.onPress} scaleTo={0.985} accessibilityLabel={r.title}>
                <Surface style={styles.card}>
                  <Image source={r.image} style={styles.thumb} contentFit="cover" transition={220} />
                  <View style={styles.cardBody}>
                    <View style={[styles.chip, { backgroundColor: `${verticalColor[vertical]}1A` }]}>
                      <Text variant="2xs" weight="bold" style={{ color: verticalColor[vertical] }}>
                        {label.toUpperCase()}
                      </Text>
                    </View>
                    <Text variant="base" weight="bold" tone="brand900" numberOfLines={2}>
                      {r.title}
                    </Text>
                    <Text variant="sm" tone="ink500" numberOfLines={1}>
                      {r.sub}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text variant="md" weight="bold" tone="brand900">
                        {price(r.money, currency, locale)}
                      </Text>
                      {r.rating ? (
                        <View style={styles.rating}>
                          <Star size={13} color={color.accent500} fill={color.accent500} />
                          <Text variant="sm" weight="semibold" tone="ink700">
                            {r.rating.toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Surface>
              </Pressable>
            </Reveal>
          );
        }}
        ListEmptyComponent={
          active.isPending ? (
            <View style={{ gap: space[3] }}>
              {[0, 1, 2, 3].map((i) => (
                <Surface key={i} style={styles.card}>
                  <Skeleton style={styles.thumb} />
                  <View style={{ flex: 1, padding: space[3], gap: space[2] }}>
                    <Skeleton style={{ height: 12, width: "35%" }} />
                    <Skeleton style={{ height: 16, width: "80%" }} />
                    <Skeleton style={{ height: 12, width: "50%" }} />
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <SearchX size={30} color={color.brand500} strokeWidth={1.8} />
              <Text variant="md" weight="bold" tone="brand900" center style={{ marginTop: space[3] }}>
                {t("results.none")}
              </Text>
              {/* §1: never just "0 results" — say what to do next. */}
              <Text variant="sm" tone="ink700" center style={{ marginTop: space[2] }}>
                {t("results.noneBody")}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  card: { flexDirection: "row", overflow: "hidden" },
  thumb: { width: 108, height: 118, backgroundColor: color.ink50 },
  cardBody: { flex: 1, padding: space[3], gap: space[1] },
  chip: { alignSelf: "flex-start", borderRadius: radius.sm, paddingHorizontal: space[2], paddingVertical: 3 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[1]
  },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  empty: {
    alignItems: "center",
    paddingVertical: space[16],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
