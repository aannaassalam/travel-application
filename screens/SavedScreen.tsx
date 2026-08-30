import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { useRef } from "react";
import { Image, RefreshControl, StyleSheet, View } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListingMeta } from "@/components/ListingMeta";
import { Reveal } from "@/components/motion/Reveal";
import { ListingSheet, type ListingSheetHandle } from "@/components/sheets/ListingSheet";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/Pressable";
import { SaveButton } from "@/components/ui/SaveButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getHotel, getListing, getSiteContact } from "@/lib/api";
import { firstMedia, toSource } from "@/lib/media";
import { price } from "@/lib/money";
import { cityPhoto } from "@/lib/photos";
import { usePrefs } from "@/lib/prefs";
import { useSaved } from "@/lib/saved";
import { useRefresh } from "@/lib/useRefresh";
import { useAppNavigation } from "@/navigation/types";
import { color, radius, space } from "@/theme/tokens";
import type { Hotel, Listing } from "@/types/domain";

type SavedItem = { kind: "hotel"; hotel: Hotel } | { kind: "listing"; listing: Listing };

/**
 * Favourites, resolved live against the API — a saved item always shows
 * today's price and availability, never the snapshot from the day it was
 * hearted. A slug that stopped resolving (unpublished since) is dropped
 * rather than 404ing a card.
 */
export default function SavedScreen() {
  const { t, locale, currency, lz } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const sheet = useRef<ListingSheetHandle>(null);
  const slugs = useSaved();

  const { data, isPending, refetch } = useQuery({
    queryKey: ["saved", slugs],
    enabled: slugs.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const results = await Promise.all(
        slugs.map(async (slug): Promise<SavedItem | null> => {
          try {
            return { kind: "listing", listing: (await getListing(slug)).listing };
          } catch {
            try {
              return { kind: "hotel", hotel: (await getHotel(slug)).hotel };
            } catch {
              return null;
            }
          }
        })
      );
      return results.filter((x): x is SavedItem => Boolean(x));
    }
  });
  const contact = useQuery({ queryKey: ["site-contact"], queryFn: getSiteContact });
  const phone = contact.data?.contact.phone?.replace(/[^\d+]/g, "");
  const { refreshing, onRefresh } = useRefresh(refetch);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const items = slugs.length ? (data ?? []) : [];
  const loading = slugs.length > 0 && isPending;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("account.saved")} scrollY={scrollY} threshold={60} hero={false} />
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={items}
        // List hygiene for mid-range Android: clip offscreen rows at the
        // native level, keep ~2 screens either side instead of ~10, and paint
        // fewer rows before first frame.
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        keyExtractor={(it) => (it.kind === "hotel" ? it.hotel.slug : it.listing.slug)}
        refreshControl={
          slugs.length ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.brand500} />
          ) : undefined
        }
        contentContainerStyle={{
          paddingTop: insets.top + space[12],
          paddingBottom: insets.bottom + space[12],
          paddingHorizontal: space[5],
          gap: space[3]
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Reveal>
            <Text variant="2xl" weight="bold" display tone="brand900" style={{ marginBottom: space[4] }}>
              {t("account.saved")}
            </Text>
          </Reveal>
        }
        renderItem={({ item, index }) => {
          const isHotel = item.kind === "hotel";
          const title = isHotel ? lz(item.hotel.name) : lz(item.listing.title);
          const img = isHotel
            ? (firstMedia(item.hotel.images) ?? cityPhoto(item.hotel.city))
            : (firstMedia(item.listing.images) ?? cityPhoto(item.listing.city));
          const money = isHotel ? item.hotel.fromPrice : item.listing.sellPrice;
          const rating = isHotel ? item.hotel.rating : item.listing.rating;
          const slug = isHotel ? item.hotel.slug : item.listing.slug;
          return (
            <Reveal index={index}>
              <Pressable
                onPress={() =>
                  isHotel
                    ? navigation.navigate("Hotel", { slug })
                    : sheet.current?.open(item.listing)
                }
                scaleTo={0.985}
                accessibilityLabel={title}
              >
                <Surface style={styles.card}>
                  {img ? (
                    <FastImage source={toSource(img)} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={styles.thumb} />
                  )}
                  <View style={styles.body}>
                    <Text variant="base" weight="bold" tone="brand900" numberOfLines={2}>
                      {title}
                    </Text>
                    <Text variant="sm" tone="ink500" numberOfLines={1}>
                      {isHotel ? item.hotel.city : item.listing.city}
                    </Text>
                    {!isHotel ? <ListingMeta listing={item.listing} compact /> : null}
                    <View style={styles.foot}>
                      <Text variant="md" weight="bold" tone="brand900">
                        {price(money, currency, locale)}
                      </Text>
                      {rating ? (
                        <View style={styles.rating}>
                          <Star size={13} color={color.accent500} fill={color.accent500} />
                          <Text variant="sm" weight="semibold" tone="ink700">
                            {rating.toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.heart}>
                    <SaveButton slug={slug} onLight />
                  </View>
                </Surface>
              </Pressable>
            </Reveal>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: space[3] }}>
              {[0, 1].map((i) => (
                <Surface key={i} style={styles.card}>
                  <Skeleton style={styles.thumb} />
                  <View style={{ flex: 1, padding: space[3], gap: space[2] }}>
                    <Skeleton style={{ height: 16, width: "70%" }} />
                    <Skeleton style={{ height: 12, width: "45%" }} />
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Image
                source={require("@/assets/images/illustrations/empty-saved.png")}
                style={styles.emptyArt}
                resizeMode="contain"
              />
              <Text variant="md" weight="bold" tone="brand900" center style={{ marginTop: space[3] }}>
                {t("account.noSaved")}
              </Text>
              <Button
                label={t("account.browse")}
                onPress={() => navigation.navigate("Tabs", { screen: "ExploreTab" })}
                style={{ marginTop: space[5] }}
              />
            </View>
          )
        }
      />
      <ListingSheet ref={sheet} phone={phone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  card: { flexDirection: "row", overflow: "hidden" },
  thumb: { width: 110, alignSelf: "stretch", minHeight: 110, backgroundColor: color.ink100 },
  body: { flex: 1, padding: space[3], gap: space[1.5] },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[1]
  },
  rating: { flexDirection: "row", alignItems: "center", gap: space[1] },
  heart: { position: "absolute", top: space[2], right: space[2] },
  emptyArt: { width: 170, height: 170 },
  empty: {
    alignItems: "center",
    paddingVertical: space[12],
    paddingHorizontal: space[6],
    backgroundColor: color.brand50,
    borderRadius: radius.card
  }
});
