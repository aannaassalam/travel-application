import { useQuery } from "@tanstack/react-query";
import { GradientFill } from "@/components/ui/Gradient";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";
import { BedDouble, CalendarDays, ChevronDown, MapPin, Star, Users } from "lucide-react-native";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { useRef, useState } from "react";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeroEntrance } from "@/components/motion/HeroEntrance";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Pressable } from "@/components/ui/Pressable";
import { Sheet, type SheetHandle } from "@/components/ui/Sheet";
import { Reveal } from "@/components/motion/Reveal";
import { SaveButton } from "@/components/ui/SaveButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { getHotel } from "@/lib/api";
import { firstMedia, toSource } from "@/lib/media";
import { cityPhoto } from "@/lib/photos";
import { price } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";
import { useAppNavigation } from "@/navigation/types";
import { color, radius, space } from "@/theme/tokens";
import type { RoomType } from "@/types/domain";

const nightsBetween = (from?: string, to?: string) =>
  from && to ? Math.max(Math.round((+new Date(to) - +new Date(from)) / 86400000), 1) : 0;

const HERO_H = 280;

export default function HotelScreen() {
  const { slug } = useRoute<RouteProp<RootStackParamList, "Hotel">>().params;
  const { t, locale, currency, lz } = usePrefs();
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const datesSheet = useRef<SheetHandle>(null);
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const nights = nightsBetween(from, to);

  const { data, isPending, isError } = useQuery({
    queryKey: ["hotel", slug, from ?? "", to ?? ""],
    queryFn: () => getHotel(slug, from, to),
    // Keep the previous rooms on screen while the dated re-price loads.
    placeholderData: (prev) => prev,
    enabled: Boolean(slug)
  });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO_H, 0, HERO_H], [-HERO_H / 2, 0, HERO_H * 0.5]) },
      {
        scale: interpolate(scrollY.value, [-HERO_H, 0], [2.2, 1], {
          extrapolateRight: Extrapolation.CLAMP
        })
      }
    ]
  }));

  const h = data?.hotel;

  if (isPending || !h) {
    return (
      <View style={styles.centre}>
        {isError ? (
          <Text variant="base" tone="ink500">
            {t("common.error")}
          </Text>
        ) : (
          <ActivityIndicator color={color.brand500} />
        )}
      </View>
    );
  }

  const name = lz(h.name);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} scrollY={scrollY} threshold={HERO_H - 60} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[12] }}
      >
        <View style={styles.heroWrap}>
          {/* The image extends 400pt above its wrap: pulling the page down
              reveals more photograph, never the pale screen behind it. */}
          <Animated.View style={[styles.heroBleed, heroStyle]}>
            <HeroEntrance>
            <Image source={toSource(firstMedia(h.images) ?? cityPhoto(h.city))} style={StyleSheet.absoluteFill as never} resizeMode="cover" />
            </HeroEntrance>
          </Animated.View>
          <GradientFill colors={["rgba(10,37,64,0.4)", "rgba(10,37,64,0)", "rgba(10,37,64,0.5)"]} locations={[0, 0.45, 1]} />
          <View style={[styles.save, { top: insets.top + space[2] }]}>
            <SaveButton slug={slug} />
          </View>
        </View>

        <View style={styles.body}>
          <Reveal delay={160}>
            <Text variant="2xl" weight="bold" display tone="brand900">
              {name}
            </Text>
            <View style={styles.metaRow}>
              {h.rating ? (
                <View style={styles.metaItem}>
                  <Star size={15} color={color.accent500} fill={color.accent500} />
                  <Text variant="sm" weight="semibold" tone="ink900">
                    {h.rating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <MapPin size={15} color={color.brand500} strokeWidth={2.2} />
                <Text variant="sm" tone="ink700" numberOfLines={1}>
                  {h.address?.includes(h.city) ? h.address : [h.address, h.city].filter(Boolean).join(", ")}
                </Text>
              </View>
            </View>
            <Text variant="base" tone="ink700" style={{ marginTop: space[3] }}>
              {lz(h.description)}
            </Text>
          </Reveal>

          <Reveal index={1} delay={160}>
            <Surface padded style={styles.priceCard}>
              <Text variant="xs" weight="semibold" tone="ink500">
                {t("common.from").toUpperCase()}
              </Text>
              <Text variant="2xl" weight="bold" tone="brand900">
                {price(h.fromPrice, currency, locale)}
              </Text>
            </Surface>
          </Reveal>

          {h.amenities?.length ? (
            <Reveal index={2} delay={160}>
              <View style={styles.chips}>
                {h.amenities.slice(0, 8).map((a) => (
                  <View key={a} style={styles.chip}>
                    <Text variant="xs" weight="medium" tone="ink700">
                      {a}
                    </Text>
                  </View>
                ))}
              </View>
            </Reveal>
          ) : null}

          {/* ---- rooms: pick dates once, then book any room --------------- */}
          {h.roomTypes?.length ? (
            <Reveal index={3} delay={160}>
              <Text variant="lg" weight="bold" tone="brand900" style={{ marginTop: space[8] }}>
                {t("hotel.rooms")}
              </Text>
              <Pressable
                onPress={() => datesSheet.current?.open()}
                style={styles.datesRow}
                haptic="selection"
                accessibilityLabel={t("booking.dates")}
              >
                <CalendarDays size={17} color={color.brand500} strokeWidth={2.2} />
                <Text
                  variant="base"
                  weight="semibold"
                  tone={from && to ? "ink900" : "ink500"}
                  style={{ flex: 1 }}
                >
                  {from && to
                    ? `${from} → ${to} · ${nights} ${t("booking.nights")}`
                    : t("booking.pickDates")}
                </Text>
                <ChevronDown size={17} color={color.ink500} strokeWidth={2.2} />
              </Pressable>

              <View style={{ gap: space[3], marginTop: space[3] }}>
                {h.roomTypes.map((rt) => (
                  <RoomCard
                    key={rt.id}
                    room={rt}
                    nights={nights}
                    onBook={() => {
                      if (!from || !to) {
                        datesSheet.current?.open();
                        return;
                      }
                      navigation.navigate("Booking", {
                        selection: {
                          vertical: "HOTEL",
                          roomTypeId: rt.id,
                          title: `${name} — ${lz(rt.name)}`,
                          sub: h.city,
                          image: firstMedia(rt.images) ?? firstMedia(h.images),
                          unitPrice: rt.sellPrice ?? {},
                          quantity: 1,
                          units: nights,
                          unitNoun: "night",
                          startDate: from,
                          endDate: to
                        }
                      });
                    }}
                  />
                ))}
              </View>
            </Reveal>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Sheet ref={datesSheet} title={t("booking.dates")}>
        <Calendar
          start={from}
          end={to}
          onChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
        />
        <Button
          label={t("common.done")}
          onPress={() => datesSheet.current?.close()}
          disabled={!from || !to}
          full
          style={{ marginTop: space[3] }}
        />
      </Sheet>
    </View>
  );
}

function RoomCard({
  room: rt,
  nights,
  onBook
}: {
  room: RoomType;
  nights: number;
  onBook: () => void;
}) {
  const { t, locale, currency, lz } = usePrefs();
  const img = firstMedia(rt.images);
  // Only a dated stay can honestly be sold out; the dateless number is the
  // tightest night in the whole calendar and would mark everything Complet.
  const soldOut = nights > 0 && typeof rt.available === "number" && rt.available <= 0;
  return (
    <Surface style={styles.room}>
      {img ? <Image source={toSource(img)} style={styles.roomImage} resizeMode="cover" /> : null}
      <View style={styles.roomBody}>
        <Text variant="base" weight="bold" tone="brand900" numberOfLines={1}>
          {lz(rt.name)}
        </Text>
        <View style={styles.roomMeta}>
          <View style={styles.roomMetaItem}>
            <BedDouble size={14} color={color.ink500} strokeWidth={2.2} />
            <Text variant="xs" tone="ink700">{rt.beds}</Text>
          </View>
          <View style={styles.roomMetaItem}>
            <Users size={14} color={color.ink500} strokeWidth={2.2} />
            <Text variant="xs" tone="ink700">{rt.maxAdults}</Text>
          </View>
        </View>
        <View style={styles.roomFoot}>
          <View>
            <Text variant="md" weight="bold" tone="brand900">
              {price(rt.sellPrice, currency, locale)}
            </Text>
            <Text variant="2xs" tone="ink500">
              {t("hotel.perNight")}
              {nights > 1 ? ` · ${nights} ${t("booking.nights")}` : ""}
            </Text>
          </View>
          {soldOut ? (
            <Text variant="sm" weight="bold" tone="ink500">
              {t("listing.soldOut")}
            </Text>
          ) : (
            <Button label={t("listing.book")} size="sm" onPress={onBook} />
          )}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.paper },
  heroWrap: { height: HERO_H, backgroundColor: color.ink100 },
  heroBleed: {
    position: "absolute",
    top: -400,
    left: 0,
    right: 0,
    height: HERO_H + 400
  },
  save: { position: "absolute", right: space[4] },
  body: {
    paddingHorizontal: space[5],
    paddingTop: space[6],
    marginTop: -space[6],
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.xl3,
    borderTopRightRadius: radius.xl3
  },
  metaRow: { gap: space[2], marginTop: space[3] },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  priceCard: { marginTop: space[6], gap: space[1] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[6] },
  chip: {
    backgroundColor: color.ink50,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2]
  },
  datesRow: {
    marginTop: space[3],
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.ink100
  },
  room: { overflow: "hidden" },
  roomImage: { width: "100%", height: 120, backgroundColor: color.ink100 },
  roomBody: { padding: space[3], gap: space[2] },
  roomMeta: { flexDirection: "row", gap: space[4] },
  roomMetaItem: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  roomFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space[1]
  }
});
