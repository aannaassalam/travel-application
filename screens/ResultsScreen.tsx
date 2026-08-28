import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Image, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpDown, Check, Search, Star } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { ListingSheet, type ListingSheetHandle } from "@/components/sheets/ListingSheet";
import { Pressable } from "@/components/ui/Pressable";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { ListingMeta } from "@/components/ListingMeta";
import { getHotel, getSiteContact, searchHotels, searchListings } from "@/lib/api";
import { firstMedia, toSource } from "@/lib/media";
import { price } from "@/lib/money";
import { cityPhoto } from "@/lib/photos";
import { navKey } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { useAppNavigation, type RootStackParamList } from "@/navigation/types";
import { useQueryClient } from "@tanstack/react-query";
import { color, font, radius, space } from "@/theme/tokens";
import type { Hotel, Listing, Money } from "@/types/domain";

/** One shape for both queries, so the row does not care which one filled it. */
interface Row {
  id: string;
  slug: string;
  title: string;
  sub: string;
  description: string;
  image?: string | number;
  money: Money;
  rating?: number;
  reviewCount?: number;
  isHotel: boolean;
  listing?: Listing;
  hotel?: Hotel;
}

const AnimatedFlatList = Animated.FlatList<Row>;

/**
 * One results screen for every vertical.
 *
 * Hotels navigate to their own screen. Everything else opens a details sheet —
 * the previous build left those rows silent on tap, and a card that does
 * nothing when pressed is the single most disorienting thing an app can do.
 * The sheet is honest about what the app can do today: read the details, then
 * book by phone or on the website.
 */
export default function ResultsScreen() {
  const { vertical, destination } = useRoute<RouteProp<RootStackParamList, "Results">>().params;
  const { t, locale, currency, lz } = usePrefs();
  const navigation = useAppNavigation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const detailSheet = useRef<ListingSheetHandle>(null);
  const sortSheet = useRef<SheetHandle>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");

  const isHotel = vertical === "HOTEL";
  const label = t(navKey(vertical));

  // Sort is the server's job — price order must respect the typed per-currency
  // prices, not a client-side guess. The free-text filter is client-side: it
  // narrows the thirty rows already on screen, instantly, offline.
  const hotels = useQuery({
    queryKey: ["hotels", destination ?? "", sort],
    queryFn: () => searchHotels({ destination, sort, limit: 30 }),
    enabled: isHotel
  });
  const listings = useQuery({
    queryKey: ["listings", vertical, destination ?? "", sort],
    queryFn: () => searchListings({ vertical, destination, sort, limit: 30 }),
    enabled: !isHotel
  });
  // Fetched here, once, so the sheet's phone button is ready before it opens.
  const contact = useQuery({ queryKey: ["site-contact"], queryFn: getSiteContact });

  const active = isHotel ? hotels : listings;
  const rows: Row[] = isHotel
    ? (hotels.data?.items ?? []).map((h) => ({
        id: h.id,
        slug: h.slug,
        title: lz(h.name),
        // The seeded addresses already end in the city; joining blindly
        // printed "Bel-Air, Lubumbashi, Lubumbashi".
        sub: h.address?.includes(h.city) ? h.address : [h.address, h.city].filter(Boolean).join(", "),
        description: lz(h.description),
        image: firstMedia(h.images) ?? cityPhoto(h.city),
        money: h.fromPrice,
        rating: h.rating,
        reviewCount: h.reviewCount,
        isHotel: true,
        hotel: h
      }))
    : (listings.data?.items ?? []).map((l) => ({
        id: l.id,
        slug: l.slug,
        title: lz(l.title),
        sub: l.city,
        description: lz(l.description),
        image: firstMedia(l.images) ?? cityPhoto(l.city),
        money: l.sellPrice,
        rating: l.rating,
        reviewCount: l.reviewCount,
        isHotel: false,
        listing: l
      }));

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.sub}`.toLowerCase().includes(q));
  }, [rows, query]);

  const SORTS = [
    ["recommended", t("results.sortRecommended")],
    ["price_asc", t("results.sortPriceAsc")],
    ["price_desc", t("results.sortPriceDesc")],
    ["rating", t("results.sortRating")]
  ] as const;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const suffix =
    vertical === "HOTEL"
      ? t("hotel.perNight")
      : vertical === "CAR"
        ? t("listing.perDay")
        : vertical === "PROPERTY"
          ? ""
          : t("listing.perPerson");

  const warmHotel = (slug: string) =>
    void qc.prefetchQuery({
      queryKey: ["hotel", slug, "", ""],
      queryFn: () => getHotel(slug),
      staleTime: 60_000
    });

  const open = (row: Row) => {
    if (row.isHotel) {
      navigation.navigate("Hotel", { slug: row.slug });
      return;
    }
    const full = listings.data?.items.find((l) => l.id === row.id);
    if (full) detailSheet.current?.open(full);
  };

  const phone = contact.data?.contact.phone?.replace(/[^\d+]/g, "");

  return (
    <View style={styles.screen}>
      <ScreenHeader title={label} scrollY={scrollY} threshold={90} hero={false} />
      <AnimatedFlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={shown}
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
              <Text variant="sm" tone="ink500" style={{ marginTop: space[1] }}>
                {destination ? `${destination} · ` : ""}
                {active.data?.total ?? 0} {t("results.count")}
              </Text>
            )}
            <View style={styles.tools}>
              <View style={styles.searchBox}>
                <Search size={17} color={color.ink500} strokeWidth={2.2} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("results.search")}
                  placeholderTextColor={color.ink500}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
              <Pressable
                onPress={() => sortSheet.current?.open()}
                style={styles.sortBtn}
                haptic="selection"
                accessibilityLabel={t("results.sort")}
              >
                <ArrowUpDown size={16} color={color.brand700} strokeWidth={2.2} />
                <Text variant="sm" weight="semibold" tone="brand700">
                  {t("results.sort")}
                </Text>
              </Pressable>
            </View>
          </Reveal>
        }
        renderItem={({ item: r, index }) => (
          <Reveal index={index}>
            <Pressable
              onPress={() => open(r)}
              onPressIn={r.isHotel ? () => warmHotel(r.slug) : undefined}
              scaleTo={0.985}
              accessibilityLabel={r.title}
            >
              <Surface style={styles.card}>
                {r.image ? (
                  <Image source={toSource(r.image)} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]} />
                )}
                <View style={styles.cardBody}>
                  {/* No category chip here: the screen is already filtered and
                      titled. Everything else the website's row says, this row
                      says — times, transmission, bedrooms, amenities. */}
                  <View style={styles.titleRow}>
                    <Text variant="base" weight="bold" tone="brand900" numberOfLines={2} style={{ flex: 1 }}>
                      {r.title}
                    </Text>
                    {r.hotel?.stars ? (
                      <Text variant="xs" style={{ color: color.accent500 }}>
                        {"★".repeat(r.hotel.stars)}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="sm" tone="ink500" numberOfLines={1}>
                    {r.sub}
                  </Text>
                  {r.listing ? <ListingMeta listing={r.listing} compact /> : null}
                  {r.hotel?.amenities?.length ? (
                    <View style={styles.amenities}>
                      {r.hotel.amenities.slice(0, 3).map((a) => (
                        <View key={a} style={styles.amenity}>
                          <Text variant="2xs" weight="medium" tone="ink700">
                            {a}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.priceRow}>
                    <Text variant="md" weight="bold" tone="brand900">
                      {price(r.money, currency, locale)}
                      {suffix ? (
                        <Text variant="2xs" tone="ink500"> {suffix}</Text>
                      ) : null}
                    </Text>
                    {r.rating ? (
                      <View style={styles.rating}>
                        <Star size={13} color={color.accent500} fill={color.accent500} />
                        <Text variant="sm" weight="semibold" tone="ink700">
                          {r.rating.toFixed(1)}
                          {r.reviewCount ? ` (${r.reviewCount})` : ""}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Surface>
            </Pressable>
          </Reveal>
        )}
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
              <Image
                source={require("@/assets/images/illustrations/empty-results.png")}
                style={styles.emptyArt}
                resizeMode="contain"
              />
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

      <Sheet ref={sortSheet} title={t("results.sort")}>
        {SORTS.map(([value, label_]) => (
          <Pressable
            key={value}
            onPress={() => {
              setSort(value);
              sortSheet.current?.close();
            }}
            style={styles.sortRow}
            haptic="selection"
            accessibilityState={{ selected: sort === value }}
            accessibilityLabel={label_}
          >
            <Text
              variant="base"
              weight={sort === value ? "bold" : "medium"}
              tone={sort === value ? "brand900" : "ink700"}
            >
              {label_}
            </Text>
            {sort === value ? <Check size={18} color={color.brand900} strokeWidth={2.6} /> : null}
          </Pressable>
        ))}
      </Sheet>

      <ListingSheet ref={detailSheet} phone={phone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  card: { flexDirection: "row", overflow: "hidden" },
  thumb: { width: 108, alignSelf: "stretch", minHeight: 122, backgroundColor: color.ink50 },
  thumbFallback: { backgroundColor: color.brand50 },
  cardBody: { flex: 1, padding: space[3], gap: space[1] },
  chip: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 3
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[1]
  },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: space[1.5] },
  amenity: {
    backgroundColor: color.ink50,
    borderRadius: 6,
    paddingHorizontal: space[2],
    paddingVertical: 2
  },
  sheetImage: { width: "100%", height: 170, borderRadius: radius.lg, backgroundColor: color.ink50 },
  tools: { flexDirection: "row", gap: space[2], marginTop: space[3], marginBottom: space[2] },
  searchBox: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.ink100
  },
  searchInput: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.ink900, paddingVertical: 0 },
  sortBtn: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: space[1.5],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.brand50,
    borderWidth: 1,
    borderColor: color.brand100
  },
  sortRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  emptyArt: { width: 160, height: 160 },
  empty: {
    alignItems: "center",
    paddingVertical: space[12],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
